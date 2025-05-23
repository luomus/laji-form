import * as React from "react";
// import * as PropTypes from "prop-types";
import ReactContext from "../../ReactContext";
import { getUiOptions, isDescendant, classNames, useBooleanSetter, usePrevious } from "../../utils";
import { EnumOptionsType as _EnumOptionsType} from "@rjsf/utils";
import { JSONSchemaArray, JSONSchemaEnum, JSONSchemaEnumOneOf, WidgetProps } from "../../types";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findDOMNode } from "react-dom";
const Spinner = require("react-spinner");

const useRangeIncrementor = (length: number, defaultIdx?: number)
	: [number | undefined, () => void, () => void, (idx?: number) => void]  => {
	const [idx, _setIdx] = useState<number | undefined>(defaultIdx);
	const setIdx = useCallback((idx?: number) => {
		let nextIdx: number | undefined = idx;
		if (idx === undefined || idx < 0 || length === 0) {
			nextIdx = undefined;
		} else if (idx >= length) {
			nextIdx = length - 1;
		}
		_setIdx(nextIdx);
	}, [ _setIdx, length]);
	const increment = useCallback(() => setIdx((idx || 0) - 1), [idx, setIdx]);
	const decrement = useCallback(() => setIdx(idx === undefined ? 0 : idx + 1), [idx, setIdx]);
	return [idx === undefined ? idx : Math.min(idx, length - 1), increment, decrement, _setIdx];
};

type EnumOptionsType<T = string | undefined> = Omit<_EnumOptionsType, "value"> & { value: T };

function removeByIndex<T>(array: T[], index: number): T[] {
	return [...array.slice(0, index), ...array.slice(index + 1)];
}

function getEnumOptions(enumOptions: EnumOptionsType[], uiSchema: any, includeEmpty: true): EnumOptionsType<string | undefined>[];
function getEnumOptions(enumOptions: EnumOptionsType[], uiSchema: any, includeEmpty: undefined | false): EnumOptionsType<string>[];
function getEnumOptions(enumOptions: EnumOptionsType[], uiSchema: any, includeEmpty?: boolean): EnumOptionsType<string | undefined>[];
function getEnumOptions(enumOptions: EnumOptionsType[], uiSchema: any, includeEmpty = true): EnumOptionsType<string | undefined>[] {
	const enums: EnumOptionsType[] = (getUiOptions(uiSchema).enumOptions || enumOptions);
	const emptyIdx = enums.findIndex(e => e.value === "");
	if (!includeEmpty) {
		return emptyIdx !== -1
			? removeByIndex(enums, emptyIdx)
			: enums;
	} else {
		return emptyIdx !== -1
			? enums.map(e => e.value === "" ? { value: undefined, label: "" } : e)
			: [{ value: undefined, label: "" }, ...enums];
	}
}

type SelectWidgetCustomProps = {
	includeEmpty?: boolean;
	getEnumOptionsAsync?: () => Promise<EnumOptionsType<string>[]>
}

type SingleSelectWidgetProps = Omit<WidgetProps<JSONSchemaEnum>, "value" | "onChange"> & {
	value?: string
	onChange: (value?: string) => void;
} & SelectWidgetCustomProps;
type MultiSelectWidgetProps = Omit<WidgetProps<JSONSchemaArray<JSONSchemaEnumOneOf>>, "value" | "onChange"> & {
	value?: string[]
	onChange: (value?: string[]) => void;
} & SelectWidgetCustomProps;

type SelectWidgetProps = SingleSelectWidgetProps | MultiSelectWidgetProps;
export default function SelectWidget(props: SelectWidgetProps): JSX.Element | null {
	return props.schema.type === "array" ? <SearchableMultiDrowndown {...props as MultiSelectWidgetProps} /> : <SearchableDrowndown {...props as SingleSelectWidgetProps} />;
}

function SearchableDrowndown(props: SingleSelectWidgetProps) {
	const {
		id,
		disabled,
		readonly,
		value,
		uiSchema,
		options,
		onChange,
		includeEmpty = true,
		resetActiveItemOnSelect = false
	} = props;
	const { theme } = useContext(ReactContext);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<typeof FormControl>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const enumOptions = useMemo(() =>
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		getEnumOptions(options.enumOptions!, uiSchema, includeEmpty),
	[options.enumOptions, uiSchema, includeEmpty]);

	const getLabelFromValue = useCallback((value: string | undefined) => 
		value !== undefined && value !== ""
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			? enumOptions.find(item => item.value === value)!.label
			: ""
	, [enumOptions]);

	const [inputValue, setInputValue] = useState(getLabelFromValue(value));
	const [inputTouched, setInputTouched] = useState(false);
	const [filterTerm, setFilterTerm] = useState("");

	const onInputChange = useCallback((e) => {
		const {value} = e.target;
		setInputValue(value);
		setInputTouched(true);
	}, []);

	useEffect(() => {
		inputTouched && setFilterTerm(inputValue);
	}, [inputTouched, inputValue]);

	const displayedEnums = useMemo(() => {
		return filterTerm !== ""
			? enumOptions.filter(
				({ label }) => label.toLowerCase().includes(filterTerm.toLowerCase())
			)
			: enumOptions;
			
	}, [filterTerm, enumOptions]);

	const [isOpen, show, hide] = useBooleanSetter(false);

	const { FormControl } = theme;

	const [activeIdx, activeIdxUp, activeIdxDown, setActiveIdx] = useRangeIncrementor(
		(displayedEnums || []).length,
		getDefaultActiveIdx(displayedEnums, value)
	);

	useEffect(() => {
		if (inputTouched) {
			return;
		}
		setActiveIdx(enumOptions.findIndex(item => item.value === value || ""));
	}, [inputTouched, value, enumOptions, getLabelFromValue, setActiveIdx]);

	useEffect(() => {
		if (activeIdx !== undefined && activeIdx !== -1 && displayedEnums) {
			setInputValue(displayedEnums[activeIdx].label);
		}
	}, [activeIdx, displayedEnums]);

	const onItemSelected = useCallback((item: EnumOptionsType) => {
		onChange(item.value);
		setInputTouched(false);
		if (!resetActiveItemOnSelect) {
			setActiveIdx(displayedEnums.findIndex(enu => enu.value === item.value));
		} else {
			setActiveIdx(getDefaultActiveIdx(displayedEnums, value));
		}
		hide();
	}, [resetActiveItemOnSelect, displayedEnums, value, hide, onChange, setActiveIdx]);

	const onBlur = useCallback((e: any) => {
		// Fixes the issue that when user tries to click an enum item, `setOpen(false)`
		// hides the enum list, so the elem list item is hidden before the click, thus never
		// sending a click event.
		if (e.relatedTarget && isDescendant(containerRef.current, e.relatedTarget)) {
			return;
		}
		if (activeIdx !== undefined && displayedEnums[activeIdx]) {
			onItemSelected(displayedEnums[activeIdx]);
		} else {
			setInputValue("");
		}
		hide();
	}, [activeIdx, displayedEnums, hide, onItemSelected]);

	const onKeyDown = useCallback((e) => {
		switch (e.key) {
		case "ArrowDown":
			activeIdxDown();
			e.preventDefault();
			break;
		case "ArrowUp":
			activeIdxUp();
			e.preventDefault();
			break;
		case "Enter":
			activeIdx !== undefined && activeIdx !== -1 && displayedEnums && onItemSelected(displayedEnums[activeIdx]);
			e.preventDefault();
			break;
		case "Escape":
			setInputValue("");
			setActiveIdx(getDefaultActiveIdx(displayedEnums, value));
			e.preventDefault();
			break;
		}
	}, [activeIdx, activeIdxDown, activeIdxUp, displayedEnums, onItemSelected, setActiveIdx, value]);

	const onFocus = useCallback(() => {
		show();
		(findDOMNode(inputRef.current as any) as any)?.setSelectionRange(0, inputValue.length);
	}, [inputValue.length, show]);

	return (
		<div onBlur={onBlur} onKeyDown={onKeyDown} ref={containerRef} style={{ position: "relative" }} className="laji-form-dropdown-container">
			<FormControl disabled={disabled || readonly} id={id} onFocus={onFocus} value={inputValue} onChange={onInputChange} autoComplete="off" placeholder={options.placeholder} ref={inputRef} />
			<Caret onFocus={onFocus} />
			<div
				className={`laji-form-dropdown laji-form-dropdown-${isOpen ? "open" : "closed"}`}
				style={{ position: "absolute" }}
				tabIndex={-1}
			  ref={dropdownRef}>
				{displayedEnums.map((oneOf, idx) => (
					<ListItem
						key={oneOf.value ?? ""}
						onSelected={onItemSelected}
						active={idx === activeIdx }
					>{ oneOf }</ListItem>
				))}
			</div>
		</div>
	);
}

function SearchableMultiDrowndown(props: MultiSelectWidgetProps): JSX.Element {
	const {
		id,
		disabled,
		readonly,
		value,
		uiSchema,
		options,
		onChange,
		getEnumOptionsAsync
	} = props;
	const [enumOptions, setEnumOptions] = useState(getEnumOptionsAsync
		? undefined
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		: getEnumOptions(options.enumOptions!, uiSchema, false)
	);

	const [inputValue, setInputValue] = useState("");
	const [filterTerm, setFilterTerm] = useState("");
	const [loading, setLoading] = useState<boolean | undefined>(undefined);
	const [isOpen, show, hide] = useBooleanSetter(false);

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);

	const onInputChange = useCallback((e) => {
		const {value} = e.target;
		setInputValue(value);
	}, []);

	React.useEffect(() => {
		setFilterTerm(inputValue);
	}, [inputValue]);

	const displayedEnums = React.useMemo(() => {
		if (!enumOptions) {
			return [];
		}
		const notAlreadySelected = value?.length
			? enumOptions.filter(({ value: enumValue }) =>
				!value.includes(enumValue)
			)
			: enumOptions;
		return filterTerm !== ""
			? notAlreadySelected.filter(
				({ label, value: enumValue }) =>
					(value || []).includes(enumValue)
					|| label.toLowerCase().match(filterTerm.toLowerCase())
			)
			: notAlreadySelected;
			
	}, [filterTerm, enumOptions, value]);

	const [activeIdx, activeIdxUp, activeIdxDown, setActiveIdx] = useRangeIncrementor(
		(displayedEnums || []).length,
		undefined
	);

	const onItemSelected = useCallback((item: EnumOptionsType<string>) => {
		onChange([...(value || []), item.value]);
		inputRef.current?.focus();
		setActiveIdx(undefined);
	}, [onChange, setActiveIdx, value]);

	const onItemSelectedByBlur = useCallback((item: EnumOptionsType<string>) => {
		onChange([...(value || []), item.value]);
		setActiveIdx(undefined);
	}, [onChange, setActiveIdx, value]);

	const [isFocused, setFocused, setBlurred] = useBooleanSetter(false);

	const loadEnums = useCallback(() => {
		const asyncOp = async () => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const enums = await getEnumOptionsAsync!();
				setEnumOptions(enums);
			} finally {
				setLoading(false);
			}
		};
		setLoading(true);
		void asyncOp();
	}, [getEnumOptionsAsync]);

	const prevEnumOptions = usePrevious(enumOptions);

	// If the enums are async loaded, this effect takes care of opening the
	// dropdown once the enums are loaded, if the input if still focused.
	useEffect(() => {
		if (!getEnumOptionsAsync) {
			return;
		}
		if (isFocused && !prevEnumOptions?.length && enumOptions?.length) {
			show();
		}
	}, [prevEnumOptions, enumOptions, isFocused, show, getEnumOptionsAsync]);

	// If there is a pre-existing value (or a value is updated from parent after component is rendered) and we are async,
	// load the enums.
	useEffect(() => {
		if (value?.length && getEnumOptionsAsync && !enumOptions && !loading) {
			loadEnums();
		}
	}, [enumOptions, getEnumOptionsAsync, loadEnums, loading, value?.length]);

	const onFocus = useCallback(() => {
		setFocused();
		if (!enumOptions?.length && getEnumOptionsAsync) {
			void loadEnums();
		} else {
			show();
		}
	}, [enumOptions?.length, getEnumOptionsAsync, loadEnums, setFocused, show]);

	const onBlur = useCallback((e: any) => {
		// Fixes the problem when user tries to click an enum item, `setOpen(false)`
		// hides the enum list, so the elem list item is hidden before the click, thus never
		// sending a click event.
		if (e.relatedTarget && isDescendant(containerRef.current, e.relatedTarget)) {
			return;
		}
		setBlurred();
		hide();
		if (activeIdx !== undefined && displayedEnums[activeIdx]) {
			onItemSelectedByBlur(displayedEnums[activeIdx]);
		} else {
			setInputValue("");
		}
	}, [activeIdx, displayedEnums, hide, onItemSelectedByBlur, setBlurred]);

	const onKeyDown = useCallback((e) => {
		switch (e.key) {
		case "ArrowDown":
			activeIdxDown();
			e.preventDefault();
			break;
		case "ArrowUp":
			activeIdxUp();
			e.preventDefault();
			break;
		case "Enter":
			activeIdx !== undefined && displayedEnums && onItemSelected(displayedEnums[activeIdx]);
			e.preventDefault();
			break;
		case "Escape":
			setInputValue("");
			setActiveIdx(undefined);
			e.preventDefault();
			break;
		case "Backspace":
			if (inputValue === "" && value?.length) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				onChange(value!.slice(0, -1));
				e.preventDefault();
			}
			break;
		}
	}, [activeIdx, activeIdxDown, activeIdxUp, displayedEnums, inputValue, onChange, onItemSelected, setActiveIdx, value]);

	/* eslint-disable @typescript-eslint/no-non-null-assertion */
	const onDelete = useCallback((enu: EnumOptionsType) => {
		const filtered = value!.filter(v => v !== enu.value);
		onChange(value!.length === 0 ? undefined : filtered);
	}, [onChange, value]);
	/* eslint-enable @typescript-eslint/no-non-null-assertion */

	const redirectFocusToInput = useCallback((e) => {
		// Only the input wrapper should redirect focus, otherwise the existing label deletion buttons will also redirect, breaking shift + tab navigation on the input.
		if (!e.target.classList.contains("laji-form-multiselect-input-wrapper")) {
			return;
		}
		inputRef.current?.focus();
	}, [inputRef]);

	const wrapperClassNames = classNames(
		"laji-form-multiselect-input-wrapper",
		isOpen && "laji-form-multiselect-input-wrapper-focus",
		isOpen && "input-highlight",
		(readonly || disabled) && "laji-form-multiselect-input-wrapper-readonly"
	);

	return (
		<div onBlur={onBlur} onKeyDown={onKeyDown} ref={containerRef} className="laji-form-multiselect" style={{ position: "relative" }}>
			<div className={wrapperClassNames} tabIndex={-1} onFocus={redirectFocusToInput} style={{cursor: "text"}}>
				<ul style={{listStyle: "none", display: "inline-block"}}>{
					value && enumOptions && value.map(v => enumOptions.find(({value: _value}) => v === _value) || ({value: v, label: v}))
						.map(enu =>
							<SelectedMultiValue key={enu.value}
							                    onDelete={onDelete}
							                    readonly={readonly || disabled}>{enu}</SelectedMultiValue>
						)
				}</ul>
				<input disabled={disabled || readonly}
				       id={id}
				       onFocus={onFocus}
				       value={inputValue}
				       onChange={onInputChange}
				       autoComplete="off"
				       ref={inputRef} />
				{ loading && <Spinner /> }
			</div>
			<Caret onFocus={onFocus} />
			<div
				className={`laji-form-dropdown laji-form-dropdown-${isOpen ? "open" : "closed"}`}
				style={{ position: "absolute", zIndex: 99999 }}
				tabIndex={-1}>
				{displayedEnums.map((oneOf, idx) => (
					<ListItem
						key={oneOf.value ?? ""}
						onSelected={onItemSelected}
						active={idx === activeIdx }
					>{ oneOf }</ListItem>
				))}
			</div>
		</div>
	);
}

const SelectedMultiValue = ({ children: enu, onDelete, readonly }:
{ children: EnumOptionsType, onDelete: (enu: EnumOptionsType) => void, readonly: boolean }) => {
	const onDeleteClick = useCallback(() => !readonly && onDelete(enu), [enu, onDelete, readonly]);
	return (
		<li key={enu.value} style={{display: "inline-table"}} className="laji-form-multiselect-tag">
			{enu.label}
			<span tabIndex={readonly ? undefined : 0} role={readonly ? undefined : "button"} onClick={onDeleteClick}>×</span>
		</li>
	);
};

const Caret = ({onFocus}: {onFocus: () => void}) =>
	<div className="laji-form-dropdown-caret-container" style={{ position: "absolute", pointerEvents: "none" }}>
		<span onFocus={onFocus} className="laji-form-dropdown-caret" ><img src="https://cdn.laji.fi/images/icons/caret-down.svg" /></span>
	</div>;

function ListItem(
	{ onSelected, active, children }
	: {
		onSelected: (value: EnumOptionsType) => void;
		active?: boolean;
		children: EnumOptionsType
	}
) {
	const onClick = useCallback(() => {
		onSelected(children);
	}, [children, onSelected]);
	return (
		<div onClick={onClick} className={classNames("laji-form-dropdown-item", active && "active")} tabIndex={-1} >
			{ children.label }
		</div>
	);
}

const getDefaultActiveIdx = (displayedEnums: EnumOptionsType<unknown>[], value: string | undefined) => 
	value !== undefined && value !== ""
		? displayedEnums.findIndex(item => item.value === value)
		: 0;
