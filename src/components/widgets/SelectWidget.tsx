import * as React from "react";
// import * as PropTypes from "prop-types";
import ReactContext from "../../ReactContext";
import { getUiOptions, isDescendant, classNames, useBooleanSetter } from "../../utils";
import { EnumOptionsType as _EnumOptionsType} from "@rjsf/utils";
import { JSONSchemaArray, JSONSchemaEnum, JSONSchemaEnumOneOf, WidgetProps } from "../../types";
import { useCallback } from "react";
import { findDOMNode } from "react-dom";

const useRangeIncrementor = (length: number, defaultIdx?: number)
	: [number | undefined, () => void, () => void, (idx?: number) => void]  => {
	const [idx, _setIdx] = React.useState<number | undefined>(defaultIdx);
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

function getEnumOptions(enumOptions: EnumOptionsType[], uiSchema: any, includeEmpty?: true): EnumOptionsType<string | undefined>[];
function getEnumOptions(enumOptions: EnumOptionsType[], uiSchema: any, includeEmpty?: undefined | false): EnumOptionsType<string>[];
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

type SingleSelectWidgetProps = Omit<WidgetProps<JSONSchemaEnum>, "value" | "onChange"> & {
	value?: string
	onChange: (value?: string) => void;
};
type MultiSelectWidgetProps = Omit<WidgetProps<JSONSchemaArray<JSONSchemaEnumOneOf>>, "value" | "onChange"> & {
	value?: string[]
	onChange: (value?: string[]) => void;
};

type SelectWidgetProps = SingleSelectWidgetProps | MultiSelectWidgetProps;
export default function SelectWidget(props: SelectWidgetProps): JSX.Element | null {
// export default function SelectWidget(props: SelectWidgetProps): Widget<JSONSchemaEnum | JSONSchemaArray<JSONSchemaEnumOneOf>> {
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
		includeEmpty = true
	} = props;
	const { theme } = React.useContext(ReactContext);

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<typeof FormControl>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	const enumOptions = React.useMemo(() =>
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		getEnumOptions(options.enumOptions!, uiSchema, includeEmpty),
	[options.enumOptions, uiSchema, includeEmpty]);

	const [inputValue, setInputValue] = React.useState(
		value
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			? enumOptions.find(item => item.value === value)!.label
			: ""
	);
	const [inputTouched, setInputTouched] = React.useState(false);
	const [filterTerm, setFilterTerm] = React.useState("");

	const onInputChange = useCallback((e) => {
		const {value} = e.target;
		setInputValue(value);
		setInputTouched(true);
	}, []);

	React.useEffect(() => {
		inputTouched && setFilterTerm(inputValue);
	}, [inputTouched, inputValue]);

	const displayedEnums = React.useMemo(() => {
		return filterTerm !== ""
			? enumOptions.filter(
				({ label }) => label.toLowerCase().match(filterTerm.toLowerCase())
			)
			: enumOptions;
			
	}, [filterTerm, enumOptions]);

	const [isOpen, show, hide] = useBooleanSetter(false);

	const { FormControl } = theme;

	const [activeIdx, activeIdxUp, activeIdxDown, setActiveIdx] = useRangeIncrementor(
		(displayedEnums || []).length,
		value !== undefined && value !== ""
			? displayedEnums.findIndex(item => item.value === value)
			: 0
	);

	const onItemSelected = useCallback((item: EnumOptionsType) => {
		onChange(item.value);
		setInputValue(item.label);
		setInputTouched(false);
		setActiveIdx(displayedEnums.findIndex(enu => enu.value === item.value));
		hide();
	}, [displayedEnums, hide, onChange, setActiveIdx]);


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
			activeIdx !== undefined && displayedEnums && onItemSelected(displayedEnums[activeIdx]);
			e.preventDefault();
			break;
		}
	}, [activeIdx, activeIdxDown, activeIdxUp, displayedEnums, onItemSelected]);

	const onFocus = useCallback(() => {
		show();
		(findDOMNode(inputRef.current as any) as any)?.setSelectionRange(0, inputValue.length);
	}, [inputValue.length, show]);

	return (
		<div onBlur={onBlur} onKeyDown={onKeyDown} ref={containerRef} style={{ position: "relative" }} className="laji-form-dropdown-container">
			<FormControl disabled={disabled || readonly} id={id} onFocus={onFocus} value={inputValue} onChange={onInputChange} autoComplete="off" ref={inputRef} />
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
	} = props;
	const enumOptions = React.useMemo(() =>
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		getEnumOptions(options.enumOptions!, uiSchema, false),
	[options.enumOptions, uiSchema]);

	const [inputValue, setInputValue] = React.useState("");
	const [filterTerm, setFilterTerm] = React.useState("");

	const onInputChange = useCallback((e) => {
		const {value} = e.target;
		setInputValue(value);
	}, []);

	React.useEffect(() => {
		setFilterTerm(inputValue);
	}, [inputValue]);

	const displayedEnums = React.useMemo(() => {
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

	const [isOpen, show, hide] = useBooleanSetter(false);

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);

	const [activeIdx, activeIdxUp, activeIdxDown, setActiveIdx] = useRangeIncrementor(
		(displayedEnums || []).length,
		undefined
	);

	const onItemSelected = useCallback((item: EnumOptionsType<string>) => {
		onChange([...(value || []), item.value]);
		setInputValue("");
		inputRef.current?.focus();
		setActiveIdx(undefined);
	}, [onChange, setActiveIdx, value]);

	const onItemSelectedByBlur = useCallback((item: EnumOptionsType<string>) => {
		onChange([...(value || []), item.value]);
		setInputValue("");
		setActiveIdx(undefined);
	}, [onChange, setActiveIdx, value]);

	const onBlur = useCallback((e: any) => {
		// Fixes the problem when user tries to click an enum item, `setOpen(false)`
		// hides the enum list, so the elem list item is hidden before the click, thus never
		// sending a click event.
		if (e.relatedTarget && isDescendant(containerRef.current, e.relatedTarget)) {
			return;
		}
		hide();
		if (activeIdx !== undefined && displayedEnums[activeIdx]) {
			onItemSelectedByBlur(displayedEnums[activeIdx]);
		} else {
			setInputValue("");
		}
	}, [activeIdx, displayedEnums, hide, onItemSelectedByBlur]);

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
		case "Backspace":
			if (inputValue === "" && value?.length) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				onChange(value!.slice(0, -1));
				e.preventDefault();
			}
			break;
		}
	}, [activeIdx, activeIdxDown, activeIdxUp, displayedEnums, inputValue, onChange, onItemSelected, value]);

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
		(readonly || disabled) && "laji-form-multiselect-input-wrapper-readonly"
	);

	return (
		<div onBlur={onBlur} onKeyDown={onKeyDown} ref={containerRef} className="laji-form-multiselect" style={{ position: "relative" }}>
			<div className={wrapperClassNames} tabIndex={-1} onFocus={redirectFocusToInput}>
				<ul style={{listStyle: "none", display: "inline-block"}}>{
					(value || []).map(v => enumOptions.find(({value: _value}) => v === _value))
						.map((enu: EnumOptionsType<string>) =>
							<SelectedMultiValue key={enu.value}
							                    onDelete={onDelete}
							                    readonly={readonly || disabled}>{enu}</SelectedMultiValue>
						)
				}</ul>
				<input disabled={disabled || readonly}
				       id={id}
				       onFocus={show}
				       value={inputValue}
				       onChange={onInputChange}
				       autoComplete="off"
				       ref={inputRef} />
			</div>
			<Caret onFocus={show} />
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
		<span onFocus={onFocus} className="laji-form-dropdown-caret" >⌄</span>
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
