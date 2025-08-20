import * as React from "react";
import ReactContext from "../../ReactContext";
import { getUiOptions, isDescendant, classNames, useBooleanSetter, usePrevious } from "../../utils";
import { EnumOptionsType as _EnumOptionsType} from "@rjsf/utils";
import { JSONSchemaArray, JSONSchemaEnum, JSONSchemaEnumOneOf, WidgetProps } from "../../types";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findDOMNode } from "react-dom";
import Spinner  from "react-spinner";

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

type EnumOptionsType<T = string | number | undefined> = Omit<_EnumOptionsType, "value"> & { value: T };

function removeByIndex<T>(array: T[], index: number): T[] {
	return [...array.slice(0, index), ...array.slice(index + 1)];
}

function getEnumOptions<T extends string | number>(enumOptions: EnumOptionsType<T>[], uiSchema: any, includeEmpty: true): EnumOptionsType<T | undefined>[];
function getEnumOptions<T extends string | number>(enumOptions: EnumOptionsType<T>[], uiSchema: any, includeEmpty: undefined | false): EnumOptionsType<T>[];
function getEnumOptions<T extends string | number>(enumOptions: EnumOptionsType<T>[], uiSchema: any, includeEmpty?: boolean): EnumOptionsType<T | undefined>[];
function getEnumOptions<T extends string | number>(enumOptions: EnumOptionsType<T>[], uiSchema: any, includeEmpty = true): EnumOptionsType<T | undefined>[] {
	const enums: EnumOptionsType<T>[] = (getUiOptions(uiSchema).enumOptions || enumOptions);
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

type SelectWidgetCustomProps<T> = {
	includeEmpty?: boolean;
	getEnumOptionsAsync?: () => Promise<EnumOptionsType<T>[]>
}

type SingleSelectWidgetProps<T extends string | number> = Omit<WidgetProps<JSONSchemaEnum>, "value" | "onChange"> & {
	value?: T;
	onChange: (value?: T) => void;
} & SelectWidgetCustomProps<T>;
type MultiSelectWidgetProps<T extends string | number> = Omit<WidgetProps<JSONSchemaArray<JSONSchemaEnumOneOf>>, "value" | "onChange"> & {
	value?: T[]
	onChange: (value?: T[]) => void;
} & SelectWidgetCustomProps<T>;

type SelectWidgetProps<T extends string | number> = SingleSelectWidgetProps<T> | MultiSelectWidgetProps<T>;
const SelectWidget = <T extends string | number>(props: SelectWidgetProps<T>) =>
	props.schema.type === "array"
		? <SearchableMultiDrowndown {...props as MultiSelectWidgetProps<T>} />
		: <SearchableDrowndown {...props as SingleSelectWidgetProps<T>} />;
export default SelectWidget;

export function SearchableDrowndown<T extends string | number>(props: SingleSelectWidgetProps<T>) {
	const {
		id,
		disabled,
		readonly,
		value,
		uiSchema,
		options,
		onChange,
		includeEmpty = true
	} = props;
	const { theme } = useContext(ReactContext);
	const { FormControl } = theme;

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<typeof FormControl>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const enumOptions = useMemo(() =>
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		getEnumOptions<T>(options.enumOptions!, uiSchema, includeEmpty),
	[options.enumOptions, uiSchema, includeEmpty]);

	const getLabelFromValue = useCallback((value: T | undefined) => 
		value !== undefined && value !== "" && value !== null
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			? enumOptions.find(item => item.value === value)!.label
			: ""
	, [enumOptions]);

	const [filterTerm, setFilterTerm] = useState<string | undefined>(undefined);
	const [isOpen, show, hide] = useBooleanSetter(false);

	const filteredEnums = useMemo(() => {
		return filterTerm !== undefined && filterTerm !== ""
			? enumOptions.filter(
				({ label }) => label.toLowerCase().match(filterTerm.toLowerCase())
			)
			: enumOptions;
			
	}, [filterTerm, enumOptions]);

	const [activeIdx, activeIdxUp, activeIdxDown, setActiveIdx] = useRangeIncrementor(
		(filteredEnums || []).length,
		getDefaultActiveIdx(filteredEnums, value)
	);

	const inputValue = filterTerm ?? getLabelFromValue(value);

	const showAndSelectText = useCallback(() => {
		show();
		(findDOMNode(inputRef.current as any) as any)?.setSelectionRange(0, inputValue.length);
	}, [show, inputValue.length]);

	const onInputChange = useCallback((e) => {
		const {value} = e.target;
		setFilterTerm(value);
		setActiveIdx(0);
	}, [setActiveIdx]);

	const onItemSelected = useCallback((item: EnumOptionsType<T | undefined>) => {
		if (item.value === value) {
			return;
		}
		onChange(item.value);
		setFilterTerm(undefined);
		setActiveIdx(enumOptions.findIndex(enu => enu.value === item.value));
		hide();
	}, [enumOptions, hide, onChange, setActiveIdx, value]);

	const onBlur = useCallback((e: any) => {
		// Fixes the issue that when user tries to click an enum item, `setOpen(false)`
		// hides the enum list, so the elem list item is hidden before the click, thus never
		// sending a click event.
		if (e.relatedTarget && isDescendant(containerRef.current, e.relatedTarget)) {
			return;
		}
		if (activeIdx !== undefined && filteredEnums[activeIdx]) {
			onItemSelected(filteredEnums[activeIdx]);
		} else {
			setFilterTerm(undefined);
		}
		hide();
	}, [activeIdx, filteredEnums, hide, onItemSelected]);

	const onKeyDown = useCallback((e) => {
		switch (e.key) {
		case "ArrowDown":
			if (!isOpen) {
				showAndSelectText();
			} else {
				activeIdxDown();
			}
			e.preventDefault();
			break;
		case "ArrowUp":
			if (!isOpen) {
				showAndSelectText();
			} else {
				activeIdxUp();
			}
			e.preventDefault();
			break;
		case "Enter":
			if (activeIdx !== undefined && filteredEnums) {
				onItemSelected(filteredEnums[activeIdx]);
			}
			e.preventDefault();
			break;
		case "Escape":
			setFilterTerm(undefined);
			setActiveIdx(getDefaultActiveIdx(filteredEnums, value));
			e.preventDefault();
			break;
		}
	}, [activeIdx, activeIdxDown, activeIdxUp, filteredEnums, isOpen, onItemSelected, setActiveIdx, showAndSelectText, value]);

	return (
		<div onBlur={onBlur} onKeyDown={onKeyDown} ref={containerRef} style={{ position: "relative" }} className="laji-form-dropdown-container">
			<FormControl disabled={disabled || readonly} id={id} onClick={showAndSelectText} onFocus={showAndSelectText} value={inputValue} onChange={onInputChange} autoComplete="off" ref={inputRef} />
			<Caret />
			<div
				className={`laji-form-dropdown laji-form-dropdown-${isOpen ? "open" : "closed"}`}
				style={{ position: "absolute" }}
				tabIndex={-1}
			  ref={dropdownRef}>
				{filteredEnums.map((oneOf, idx) => (
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

function SearchableMultiDrowndown<T extends string | number>(props: MultiSelectWidgetProps<T>): JSX.Element {
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
		: getEnumOptions<T>(options.enumOptions!, uiSchema, false)
	);

	const [filterTerm, setFilterTerm] = useState<string | undefined>();
	const [loading, setLoading] = useState<boolean | undefined>(undefined);
	const [isOpen, show, hide] = useBooleanSetter(false);

	const inputValue = filterTerm ?? "";

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);

	const filteredEnums = React.useMemo(() => {
		if (!enumOptions) {
			return [];
		}
		const notAlreadySelected = value?.length
			? enumOptions.filter(({ value: enumValue }) =>
				!value.includes(enumValue)
			)
			: enumOptions;
		return filterTerm !== undefined && filterTerm !== ""
			? notAlreadySelected.filter(
				({ label, value: enumValue }) =>
					(value || []).includes(enumValue)
					|| label.toLowerCase().match(filterTerm.toLowerCase())
			)
			: notAlreadySelected;
			
	}, [filterTerm, enumOptions, value]);

	const [activeIdx, activeIdxUp, activeIdxDown, setActiveIdx] = useRangeIncrementor(
		(filteredEnums || []).length,
		undefined
	);

	const onInputChange = useCallback((e) => {
		const {value} = e.target;
		setFilterTerm(value);
		setActiveIdx(undefined);
	}, [setActiveIdx]);

	const onItemSelected = useCallback((item: EnumOptionsType<T>) => {
		onChange([...(value || []), item.value]);
		setFilterTerm(undefined);
		inputRef.current?.focus();
		setActiveIdx(undefined);
	}, [onChange, setActiveIdx, value]);

	const onItemSelectedByBlur = useCallback((item: EnumOptionsType<T>) => {
		onChange([...(value || []), item.value]);
		setFilterTerm(undefined);
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
		if (activeIdx !== undefined && filteredEnums[activeIdx]) {
			onItemSelectedByBlur(filteredEnums[activeIdx]);
		} else {
			setFilterTerm(undefined);
		}
	}, [activeIdx, filteredEnums, hide, onItemSelectedByBlur, setBlurred]);

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
			activeIdx !== undefined && filteredEnums && onItemSelected(filteredEnums[activeIdx]);
			e.preventDefault();
			break;
		case "Escape":
			if (activeIdx !== undefined && filteredEnums) {
				onItemSelected(filteredEnums[activeIdx]);
			}
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
	}, [activeIdx, activeIdxDown, activeIdxUp, filteredEnums, inputValue, onChange, onItemSelected, value]);

	/* eslint-disable @typescript-eslint/no-non-null-assertion */
	const onDelete = useCallback((enu: EnumOptionsType) => {
		const filtered = value!.filter(v => v !== enu.value);
		onChange(value!.length === 0 ? undefined : filtered);
		if (isOpen) {
			inputRef.current?.focus();
		}
	}, [isOpen, onChange, value]);
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
					value && enumOptions && value.map(v => enumOptions.find(({value: _value}) => v === _value) || ({value: v, label: "" +v}))
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
			<Caret />
			<div
				className={`laji-form-dropdown laji-form-dropdown-${isOpen ? "open" : "closed"}`}
				style={{ position: "absolute", zIndex: 99999 }}
				tabIndex={-1}>
				{filteredEnums.map((oneOf, idx) => (
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

function SelectedMultiValue<T extends string | number | undefined>({ children: enu, onDelete, readonly }:
	{ children: EnumOptionsType<T>, onDelete: (enu: EnumOptionsType<T>) => void, readonly: boolean }) {
	const onDeleteClick = useCallback(() => !readonly && onDelete(enu), [enu, onDelete, readonly]);
	return (
		<li key={enu.value} style={{display: "inline-table"}} className="laji-form-multiselect-tag">
			{enu.label}
			<span tabIndex={readonly ? undefined : 0} role={readonly ? undefined : "button"} onClick={onDeleteClick}>×</span>
		</li>
	);
}

const Caret = () => (
	<div className="laji-form-dropdown-caret-container" style={{ position: "absolute", pointerEvents: "none" }}>
		<span className="laji-form-dropdown-caret" ><img src="https://cdn.laji.fi/images/icons/caret-down.svg" /></span>
	</div>
);

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

function getDefaultActiveIdx<T extends string | number>(filteredEnums: EnumOptionsType<unknown>[], value: T | undefined) {
	return value !== undefined && value !== ""
		? filteredEnums.findIndex(item => item.value === value)
		: 0;
}
