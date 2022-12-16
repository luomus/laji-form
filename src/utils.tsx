import * as React from "react";
import { findDOMNode } from "react-dom";
import { isSelect as _isSelect, isMultiSelect as _isMultiSelect, getDefaultFormState as _getDefaultFormState } from "@rjsf/utils";
import getContext from "./Context";
import ReactContext from "./ReactContext";
import update, { Spec as UpdateObject } from "immutability-helper";
import { isObject as  _isObject } from "laji-map/lib/utils";
const deepEquals = require("deep-equal");
import { UiSchema, RJSFSchema } from "@rjsf/utils";
import { FormContext, Translations, Lang, FieldProps, ByLang } from "./components/LajiForm";
import rjsfValidator from "@rjsf/validator-ajv6";

export const isObject = _isObject;

export function isHidden(uiSchema: UiSchema, property: string) {
	if (!uiSchema) return false;
	if (uiSchema[property]) uiSchema = uiSchema[property];
	return !uiSchema || uiSchema["ui:widget"] == "HiddenWidget" || uiSchema["ui:field"] == "HiddenField";
}

export function isDefaultData(formData: any, schema: any): boolean {
	switch (schema.type) {
	case "object":
		return Object.keys(schema.properties).every(field => isDefaultData(formData[field], schema.properties[field]));
	case "array":
		return (Array.isArray(formData) || formData === undefined) && (formData || []).every((item: any) => isDefaultData(item, schema.items));
	default:
		return formData === getDefaultFormState(schema);
	}
}

export function getDefaultFormState<T>(schema: RJSFSchema, formData?: T, rootSchema?: RJSFSchema) {
	return _getDefaultFormState(rjsfValidator, schema, formData, rootSchema);
}

/**
 * If you use this with schema data, note that this function doesn't check default data.
 */
export function hasData(formData: any): boolean {
	function hasValue(value: any)  {
		return value !== undefined && value !== null && value !== "";
	}
	if (!hasValue(formData)) {
		return false;
	} else {
		if (!Array.isArray(formData)) formData = [formData];
		return formData.some((data: any) => {
			if (isObject(data)) {
				return Object.keys(data).some(_field => propertyHasData(_field, data));
			}
			else return hasValue(data);
		});
	}
}

/**
 * If you use this with schema data, note that this function doesn't check default data.
 */
export function propertyHasData(field: string, container: any): boolean {
	if (!container) return false;
	const data = container[field];
	return !!(data &&
	(!isObject(data) || (Object.keys(data).length > 0 && hasData(data))) &&
	(!Array.isArray(data) || (data.length > 0 && hasData(data))));
}

export function getUpdateObjectFromJSONPath(path: string, injection: any): any {
	console.warn("'getUpdateObjectFromJSONPath' works with JSON pointers, not JSON path! This function is deprecated and will be removed in the future, please use 'getUpdateObjectFromJSONPointer' instead");
	return getUpdateObjectFromJSONPointer(path, injection);
}
export function getUpdateObjectFromJSONPointer(path: string, injection: any): any {
	let update: any = {};
	let updatePointer = update;
	let lastPathName = "";
	let splittedPath = path.split("/").filter(s => !isEmptyString(s));
	if (!splittedPath.length) {
		return update;
	}
	splittedPath.forEach((pathStep, i) => {
		updatePointer[pathStep] = {};
		if (i < splittedPath.length - 1) updatePointer = updatePointer[pathStep];
		lastPathName = pathStep;
	});

	updatePointer[lastPathName] = injection;
	return update;
}

export function immutableDelete(_obj: any, _delProp: string) {
	const simple = (obj: any, delProp: string) => {
		if (!(delProp in obj)) {
			return obj;
		}
		const newObj: any = {};
		Object.keys(obj).forEach(prop => {
			if (prop !== delProp) newObj[prop] = obj[prop];
		});
		return newObj;
	};

	if (_delProp[0] === "/") {
		const splits = _delProp.split("/");
		const last = splits.pop() as string;
		const container = parseJSONPointer(_obj, "/" + splits.join("/"), !!"safely");
		if (!container || !(last in container)) {
			return _obj;
		}
		return updateSafelyWithJSONPointer(_obj, simple(container, last as string), "/" + splits.join("/"));
	} else {
		return simple(_obj, _delProp);
	}

}

export function getUiOptions(container: UiSchema) {
	if (container) {
		const options = container["ui:options"] || container.options;
		return options ? options : {};
	}
	return {};
}

interface VirtualSchemaNamesContext {
	[name: string]: boolean;
}

interface SchemaFieldWrappersContext {
	[name: string]: boolean;
}

export function getInnerUiSchema(parentUiSchema: UiSchema) {
	let {uiSchema, ...restOfUiSchema} = parentUiSchema || {};
	if (uiSchema && ((getContext("VIRTUAL_SCHEMA_NAMES") as VirtualSchemaNamesContext)[uiSchema["ui:field"]] || (getContext("SCHEMA_FIELD_WRAPPERS") as SchemaFieldWrappersContext)[uiSchema["ui:field"]]) && parentUiSchema["ui:buttons"]) {
		uiSchema = {
			...uiSchema,
			"ui:buttons": [
				...(uiSchema["ui:buttons"] || []),
				...parentUiSchema["ui:buttons"]
			]
		};
	}
	return {
		...restOfUiSchema,
		"ui:field": undefined,
		"ui:settings": undefined,
		"ui:options": uiSchema ? undefined : restOfUiSchema["ui:options"],
		"ui:buttons": uiSchema ? undefined : parentUiSchema["ui:buttons"],
		...(uiSchema || {})
	};
}

export function isNullOrUndefined(val: any) {
	return val === null || val === undefined;
}

export function isEmptyString(val: any) {
	return val === "" || isNullOrUndefined(val);
}

export function parseJSONPointer(object: any, jsonPointer: string, safeMode?: true | "createParents", strictEmptyPath?: boolean): any;
export function parseJSONPointer(object: any, jsonPointer: string, safeMode?: false, strictEmptyPath?: boolean): any | undefined;
export function parseJSONPointer(object: any, jsonPointer: string, safeMode?: boolean | "createParents", strictEmptyPath = false): any | undefined {
	if (jsonPointer === "" || jsonPointer === "/") {
		return object;
	}

	let splitPath = String(jsonPointer).split("/");
	if (String(jsonPointer)[0] === "/") {
		splitPath = splitPath.splice(1);
	}
	if (!strictEmptyPath) {
		splitPath = splitPath.filter(s => !isEmptyString(s));
	}
	return splitPath.reduce((o, s, i) => {
		if (safeMode && !o || !(s in o)) {
			if (!o) o = {};
			if (safeMode === "createParents") {
				o[s] = {};
			} else if (i < splitPath.length - 1) {
				return {};
			}
		}
		return o[s];
	}, object);
}

export function getReactComponentName(WrappedComponent: React.ComponentClass) {
	return (
		WrappedComponent.displayName ||
		WrappedComponent.name ||
		"Component"
	);
}

export function isMultiSelect(schema: any, uiSchema?: UiSchema) {
	return _isMultiSelect(rjsfValidator, schema) && !(
		schema.type === "array" &&
		uiSchema &&
		uiSchema.items &&
		uiSchema.items["ui:field"]
	);
}

export function isSelect(schema: RJSFSchema) {
	return _isSelect(rjsfValidator, schema);
}

const SWITCH_CLASS = "laji-form-checkbox-widget-tab-target";
const IMG_ADD_CLASS = "laji-form-drop-zone";

const inputTypes = ["input", "select", "textarea"];
const tabbableSelectors = [
	...inputTypes, 
	`.${SWITCH_CLASS}`,
	`.${IMG_ADD_CLASS}`
].map(type => `${type}:not([type="hidden"]):not(:disabled):not([readonly]):not([type="file"]):not(.leaflet-control-layers-selector):not(.laji-map-input)`);
const tabbableSelectorsQuery = tabbableSelectors.join(", ");

export function getTabbableFields(elem: HTMLElement, reverse?: boolean): HTMLElement[] {
	const fieldsNodeList = elem.querySelectorAll<HTMLElement>(tabbableSelectorsQuery);
	let fields = Array.from(fieldsNodeList).filter(node => node.tabIndex !== -1);

	if (reverse) fields = fields.reverse();
	return fields as HTMLElement[];
}

export function isTabbableInput(elem: HTMLElement) {
	return elem.id.match(/^_laji-form_/)
	|| inputTypes.includes(elem.tagName.toLowerCase())
	|| elem.className.includes(SWITCH_CLASS)
	|| elem.className.includes(IMG_ADD_CLASS);
}

export function canFocusNextInput(root: React.ReactInstance, inputElem: HTMLElement) {
	const node = findDOMNode(root) as HTMLElement;
	return ((node as any)?.querySelectorAll && isTabbableInput(inputElem));
}

export function findNearestParentSchemaElem(elem: HTMLElement | null | undefined): HTMLElement | null | undefined {
	while (elem && !("id" in elem ? elem.id : "").match(/^_laji-form_/)) {
		elem = elem.parentNode as HTMLElement;
	}
	return elem;
}

export function findNearestParentTabbableElem(elem: HTMLElement): HTMLElement | undefined {
	while (!isTabbableInput(elem)) {
		elem = elem.parentNode as HTMLElement;
	}
	return elem;
}

export interface ReactUtilsType {
	findNearestParentSchemaElemId: (elem: HTMLElement) => string | undefined;
	getSchemaElementById: (id: string) => HTMLElement | null;
	focusById: (id: string, focus?: boolean) => boolean;
	focusAndScroll: (idToFocus?: string, idToScroll?: string, focus?: boolean) => boolean | undefined;
	shouldSyncScroll: () => boolean;
	syncScroll: (force: boolean) => void;
	filterItemIdsDeeply: (item: any, idSchemaId: string) => any;
	formDataIsEmpty: (props: FieldProps) => boolean;
	formDataEquals: (f1: any, f2: any, id: string) => boolean;
	keyboardClick: (fn: (e: KeyboardEvent | React.KeyboardEvent) => void) => (e: (KeyboardEvent | React.KeyboardEvent)) => void;
	getNextInput: (inputElem: HTMLElement, reverseDirection: boolean) => HTMLElement | undefined;
	focusNextInput: (reverseDirection: boolean) => void;
	getNextInputInInputs: (inputElem: HTMLElement | undefined, reverseDirection: boolean, fields: HTMLElement[]) => HTMLElement | undefined
}

export const ReactUtils = (context: FormContext): ReactUtilsType => ({
	findNearestParentSchemaElemId: _findNearestParentSchemaElemId(context),
	getSchemaElementById: _getSchemaElementById(context),
	focusById: _focusById(context),
	focusAndScroll: _focusAndScroll(context),
	shouldSyncScroll: _shouldSyncScroll(context),
	syncScroll: _syncScroll(context),
	filterItemIdsDeeply: _filterItemIdsDeeply(context),
	formDataIsEmpty: _formDataIsEmpty(context),
	formDataEquals: _formDataEquals(context),
	keyboardClick: _keyboardClick(context),
	getNextInput: getNextInput(context),
	focusNextInput: focusNextInput(context),
	getNextInputInInputs: getNextInputInInputs(context)
});

export const getNextInputInInputs = (formContext: FormContext) => (inputElem: HTMLElement | undefined, reverseDirection = false, fields: HTMLElement[]): HTMLElement | undefined => {
	const formReactNode = formContext.formRef.current;
	const formElem = findDOMNode(formReactNode) as HTMLElement;
	if (!formElem) {
		return undefined;
	}
	if (!document.activeElement) {
		return undefined;
	}
	if (!inputElem) inputElem = findNearestParentTabbableElem(document.activeElement as HTMLElement);
	if (!inputElem) {
		return undefined;
	}
	if (reverseDirection) {
		fields = fields.reverse();
	}

	if (!canFocusNextInput(formElem, inputElem)) return undefined;

	let found = false;
	for (let field of fields) {
		if (field === inputElem) {
			found = true;
			continue;
		}

		if (found) {
			// Skip hidden fields.
			if (!field.offsetParent) {
				continue;
			}
			return field;
		}
	}
	return undefined;
}


export const getNextInput = (formContext: FormContext) => (inputElem: HTMLElement, reverseDirection = false) => {
	const formElem = findDOMNode(formContext.formRef.current) as HTMLElement;
	const fields = getTabbableFields(formElem);
	return formContext.utils.getNextInputInInputs(inputElem, reverseDirection, fields);
};

export const focusNextInput = (formContext: FormContext) => (reverseDirection = false) => {
	const formReactNode = formContext.formRef.current;
	if (!formReactNode) {
		throw new Error("focusNextInput() didn't find form ref");
	}
	const {uiSchema = {}} = formReactNode.props;
	if (uiSchema.autoFocus === false) {
		return false;
	}
	const width = pixelsToBsSize(window.outerWidth);
	if (width === "xs") return false;
	const field = formContext.utils.getNextInput(document.activeElement as HTMLElement, reverseDirection);
	if (field) {
		field.focus();
		return true;
	}
	return false;
}

const _findNearestParentSchemaElemId = ({contextId}: Pick<FormContext, "contextId">) => (elem: HTMLElement) => {
	const nearestParentSchemaElem = findNearestParentSchemaElem(elem) || document.getElementById(`_laji-form_${contextId}_root`);
	return nearestParentSchemaElem ? nearestParentSchemaElem.id.replace(`_laji-form_${contextId}_`, "") : undefined;
};
export const findNearestParentSchemaElemId = (contextId: number, elem: HTMLElement) => {
	return _findNearestParentSchemaElemId({contextId})(elem);
};

const _getSchemaElementById = ({contextId}: Pick<FormContext, "contextId">) => (id: string) => {
	return document.getElementById(`_laji-form_${contextId}_${id}`);
};
export const getSchemaElementById = (contextId: number, id: string) => {
	return _getSchemaElementById({contextId})(id);
};

const _focusById = (context: FormContext) => (id: string, focus = true) => {
	const elem = getSchemaElementById(context.contextId, id);

	if (elem && document.body.contains(elem)) {
		const tabbableFields = getTabbableFields(elem);
		if (tabbableFields && tabbableFields.length) {
			focus && tabbableFields[0].focus();
			scrollIntoViewIfNeeded(elem, context.topOffset, context.bottomOffset);
			const rootContext = getContext(context.contextId);
			rootContext.lastIdToFocus = id; // Mark for components that manipulate scroll positions
			rootContext.windowScrolled = getWindowScrolled();
			return true;
		}
	}
	return false;
};

export const focusById = (context: FormContext, id: string, focus?: boolean) => _focusById(context)(id, focus);

const _focusAndScroll = (context: FormContext) => (idToFocus?: string, idToScroll?: string, focus = true) => {
	const {contextId, topOffset, bottomOffset} = context;
	const _context = getContext(contextId);
	if (idToFocus === undefined && idToScroll === undefined) return;
	if (idToFocus && !context.utils.focusById(getKeyHandlerTargetId(idToFocus, _context), focus)) return false;
	if (idToScroll) {
		const elemToScroll = document.getElementById(getKeyHandlerTargetId(idToScroll, _context));
		const elemToFocus = getSchemaElementById(contextId, getKeyHandlerTargetId(idToFocus, _context));
		if (!elemToScroll || !elemToFocus) {
			return end();
		}
		const wouldScrollTo = getScrollPositionForScrollIntoViewIfNeeded(elemToScroll, topOffset, bottomOffset);
		const scrollAmount = wouldScrollTo - getWindowScrolled();
		const {top} = elemToFocus.getBoundingClientRect();
		const viewTopDistanceFromTop = top - scrollAmount;

		// Don't scroll if scrolling would hide focused elem top.
		if (viewTopDistanceFromTop < topOffset) {
			return end();
		} else {
			scrollIntoViewIfNeeded(elemToScroll, topOffset, bottomOffset);
		}
	}
	return end();

	function end() {
		_context.lastIdToScroll = idToScroll;
		_context.lastIdToFocus = idToFocus;
		_context.windowScrolled = getWindowScrolled();
		return true;
	}
};

export const focusAndScroll = (context: FormContext, idToFocus?: string, idToScroll?: string, focus?: boolean) => _focusAndScroll(context)(idToFocus, idToScroll, focus);

const _shouldSyncScroll = (context: FormContext) => () => {
	return getContext(context.contextId).windowScrolled === getWindowScrolled();
};

export const shouldSyncScroll = (context: FormContext) => _shouldSyncScroll(context)();

export const _syncScroll = (context: FormContext) => (force = false) => {
	if (force || shouldSyncScroll(context)) {
		const {lastIdToFocus, lastIdToScroll} = getContext(context.contextId);
		focusAndScroll(context, lastIdToFocus, lastIdToScroll, false);
	}
};

export const syncScroll = (context: FormContext, force: boolean) => _syncScroll(context)(force);

export const filterLajiFormId = (item: any) => {
	if (item && item._lajiFormId) {
		const {_lajiFormId, ..._item} = item; // eslint-disable-line @typescript-eslint/no-unused-vars
		item = _item;
	}
	return item;
};

export const filterItemId = (item: any) => {
	if (item && (item._lajiFormId || item.id)) {
		const {_lajiFormId, id, ..._item} = item; // eslint-disable-line @typescript-eslint/no-unused-vars
		item = _item;
	}
	return item;
};

const _filterItemIdsDeeply = (context: FormContext) => (item: any, idSchemaId: string) => {
	const tmpIdTree = context.services.ids.getRelativeTmpIdTree(idSchemaId);
	let [_item] = walkFormDataWithIdTree(item, tmpIdTree, filterItemId);
	return _item;
};
export const filterItemIdsDeeply = (item: any, context: FormContext, idSchemaId: string) => _filterItemIdsDeeply(context)(item, idSchemaId);

const _formDataIsEmpty = (context: FormContext) => (props: FieldProps) => {
	const tmpIdTree = context.services.ids.getRelativeTmpIdTree(props.idSchema.$id);
	let [item] = walkFormDataWithIdTree(props.formData, tmpIdTree, filterItemId);
	return deepEquals(item, getDefaultFormState(props.schema, undefined, props.registry.rootSchema));
};
export const formDataIsEmpty = (props: FieldProps, context: FormContext) => _formDataIsEmpty(context)(props);

const _formDataEquals = (context: FormContext) => (f1: any, f2: any, id: string) => {
	const tmpIdTree = context.services.ids.getRelativeTmpIdTree(id);
	const [_f1, _f2] = [f1, f2].map(i => walkFormDataWithIdTree(i, tmpIdTree, filterItemId)[0]);
	return deepEquals(_f1, _f2);
};
export const formDataEquals = (f1: any, f2: any, context: FormContext, id: string) => {
	return _formDataEquals(context)(f1, f2, id);
};

const _keyboardClick = ({contextId}: Pick<FormContext, "contextId">) => (fn: (e: KeyboardEvent | React.KeyboardEvent) => void) => {
	return (e: KeyboardEvent | React.KeyboardEvent) => {
		let keys = [" ", "Enter"];
		if ((e.target as HTMLElement)?.matches?.(tabbableSelectorsQuery)) {
			const {shortcuts} = getContext(contextId);
			keys = keys.filter(k => !shortcuts[k]);
		}
		if (keys.every(k => e.key !== k)) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		fn(e);
	};
};

export const keyboardClick = (fn: (e: KeyboardEvent | React.KeyboardEvent) => void, context: FormContext) => {
	return _keyboardClick(context)(fn);
};

export function getNestedTailUiSchema(uiSchema: UiSchema) {
	while (uiSchema && uiSchema.uiSchema) {
		uiSchema = uiSchema.uiSchema;
	}
	return uiSchema;
}

export function updateTailUiSchema(uiSchema: UiSchema, updateObject: UpdateObject<any, any>) {
	let tailPointer = {} as UpdateObject<any, any>;
	let root = tailPointer;
	let uiSchemaPointer = uiSchema;
	while (uiSchemaPointer.uiSchema) {
		uiSchemaPointer = uiSchemaPointer.uiSchema;
		tailPointer.uiSchema = {};
		if (uiSchemaPointer.uiSchema) tailPointer = tailPointer.uiSchema;
	}
	tailPointer.uiSchema = updateObject;
	return update(uiSchema, root);
}

export function getNestedUiFieldsList(uiSchema: UiSchema) {
	const list = [];
	while (uiSchema.uiSchema && uiSchema.uiSchema["ui:field"]) {
		list.push(uiSchema.uiSchema["ui:field"]);
		uiSchema = uiSchema.uiSchema;
	}
	return list;
}

type BootstrapColumns = {lg: number, md: number, sm: number, xs: number};

export function getBootstrapCols(width: number) {
	return (["lg", "md", "sm", "xs"] as Array<keyof BootstrapColumns>).reduce<BootstrapColumns>((o, c) => {
		o[c] = width;
		return o;
	}, {} as BootstrapColumns);
}

export function isDescendant(parent: HTMLElement | null, child: HTMLElement) {
	let node = child.parentNode;
	while (node != null) {
		if (node == parent) {
			return true;
		}
		node = node.parentNode;
	}
	return false;
}

export function getKeyHandlerTargetId(target = "", context: any, formData?: any) { // eslint-disable-line @typescript-eslint/no-unused-vars
	while (target.match(/%\{([^{}]*)\}/)) {
		const path = /%\{([^{}]*)\}/.exec(target)?.[1] || "";
		if (!path.startsWith("context") && !path.startsWith("formData")) throw Error("Should evaluate 'context' or 'formData'");
		target = target.replace(`%{${path}}`, eval(path));
	}
	return target;
}

export function capitalizeFirstLetter(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
export function decapitalizeFirstLetter(string: string) {
	return string.charAt(0).toLowerCase() + string.slice(1);
}

export function stringifyKeyCombo(keyCombo = "") {
	return keyCombo.split("+").map(key => {
		if (key === " ") key = "space";
		return capitalizeFirstLetter(key);
	}).join(" + ");
}

export function canAdd(props: any) {
	return (!("canAdd" in props) || props.canAdd) && getUiOptions(props.uiSchema).canAdd !== false;
}

export function bsSizeToPixels(bsSize: keyof BootstrapColumns) {
	switch (bsSize) {
	case "lg":
		return 1200;
	case "md":
		return 992;
	case "sm":
		return 768;
	case "xs":
		return 576;
	default: 
		throw new Error(`Unknown bootstrap size ${bsSize}. Should be one of 'lg', 'md', 'sm' or 'xs'`);
	}
}

export function pixelsToBsSize(pixels: number) {
	if (pixels < 576) {
		return "xs";
	} else if (pixels < 768) {
		return "sm";
	} else if (pixels < 992) {
		return "md";
	} else if (pixels < 1200) {
		return "lg";
	}
	return "";
}

export function applyFunction(props: FieldProps): any {
	let {"ui:functions": functions, "ui:childFunctions": childFunctions} = (props.uiSchema || {});

	const objectOrArrayAsArray = (item: any) => (
		item ? 
			(Array.isArray(item) ?
				item : 
				[item]) :
			[]
	);

	if (childFunctions) {
		functions = [
			{"ui:field": "UiFieldMapperArrayField", "ui:options": {functions: objectOrArrayAsArray(childFunctions)}},
			...objectOrArrayAsArray(functions)
		];
	}

	if (!functions) return props;

	const computedProps = ((Array.isArray(functions)) ? functions : [functions]).reduce((_props, {"ui:field": uiField, "ui:options": uiOptions}) => {
		_props = {..._props, uiSchema: {..._props.uiSchema, "ui:field": uiField, "ui:options": uiOptions, uiSchema: undefined}};
		const {state = {}} = new (props.registry.fields[uiField] as any)(_props);
		return {..._props, ...state};
	}, {...props, formContext: props.registry.formContext});

	return {
		...computedProps,
		uiSchema: {
			...computedProps.uiSchema,
			"ui:functions": undefined,
			"ui:childFunctions": undefined,
			"ui:field": props.uiSchema["ui:field"],
			"ui:options": props.uiSchema["ui:options"],
			uiSchema: props.uiSchema.uiSchema
		}
	};
}

export function getWindowScrolled(): number {
	return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export function getScrollPositionForScrollIntoViewIfNeeded(elem: Element, topOffset = 0, bottomOffset = 0): number {
	if (!elem) return getWindowScrolled();
	const rect = elem.getBoundingClientRect();
	const html = document.documentElement;
	const height = elem.scrollHeight;
	const inView = (
		rect.top >= topOffset &&
		rect.bottom <= (window.innerHeight || html.clientHeight) - bottomOffset
	);
	const elemTopDistFromViewportTop = rect.top;
	const viewportHeight = (window.innerHeight || html.clientHeight);
	const elemBottomDistFromViewportBottom = -(elemTopDistFromViewportTop + height - viewportHeight);
	const pageScrolled = getWindowScrolled();

	if (inView) return pageScrolled;

	// Priorize scrolling the top of the element into view if showing the bottom would obscure the top of the element.
	if (pageScrolled + elemTopDistFromViewportTop - topOffset > elemTopDistFromViewportTop) {
		return pageScrolled + elemTopDistFromViewportTop - topOffset;
	} else {
		return pageScrolled - elemBottomDistFromViewportBottom + bottomOffset;
	}
}

export function scrollIntoViewIfNeeded(elem: HTMLElement, topOffset = 0, bottomOffset = 0) {
	window.scrollTo(0, getScrollPositionForScrollIntoViewIfNeeded(elem, topOffset, bottomOffset));
}

export function filter(properties: any[], filter: string[], filterType = "blacklist", getValue: (s: string) => any) {
	const filterDictionary = {} as any;
	filter.forEach(_enum => { filterDictionary[_enum] = true; });
	const filterFn = (item: any) => {
		const value = getValue ? getValue(item) : item;
		return filterDictionary[value];
	};
	return properties.filter(filterType === "whitelist" ? filterFn : e => !filterFn(e));
}

export function updateSafelyWithJSONPath(obj: any, value: any, path: string, immutably: boolean, createNew: (obj: any, split: string) => any) {
	console.warn("'updateSafelyWithJSONPath' works with JSON pointers, not JSON path! This function is deprecated and will be removed in the future, please use 'updateSafelyWithJSONPointer' instead");
	return updateSafelyWithJSONPointer(obj, value, path, immutably, createNew);
}
export function updateSafelyWithJSONPointer(obj: any, value: any, path: string, immutably = true, createNew: (obj: any, split: string, o?: any, _split?: string) => any = () => ({})) {
	if (path === "/") {
		return value;
	}
	if (!immutably) {
		const splitted = path.split("/").filter(s => !isEmptyString(s));
		splitted.reduce((o, split, i) => {
			if (i === splitted.length - 1) {
				o[split] = value;
				return;
			}
			if (!o[split]) {
				o[split] = createNew(o, split);
			}
			return o[split];
		}, obj);
		return obj;
	}

	let injectionTarget = false;
	try {
		injectionTarget = parseJSONPointer(obj, path);
	} catch (e) {
		injectionTarget = makePath(injectionTarget);
	}

	// If path for injection doesn't exist, we create it immutably.
	if (!injectionTarget) {
		injectionTarget = makePath(injectionTarget);
	}

	const updateObject = getUpdateObjectFromJSONPointer(path, {$set: value});
	return update(obj, updateObject);

	function makePath(injectionTarget: any) {
		const splitPath = path.split("/").filter(s => !isEmptyString(s));
		let _splitPath = "";
		splitPath.reduce((o, split) => {
			_splitPath += `/${split}`;
			if (!o[split]) {
				obj = update(obj, getUpdateObjectFromJSONPointer(_splitPath, {$set: createNew(obj, _splitPath, o, split)}));
			}
			const next = parseJSONPointer(obj, _splitPath);
			injectionTarget = next;
			return next;
		}, obj);

		return injectionTarget;
	}
}

export function injectButtons(uiSchema: any, buttons: any[], buttonsPath: string) {
	const existingButtons = parseJSONPointer(uiSchema,  `${buttonsPath}/ui:options/buttons`);
	return updateSafelyWithJSONPointer(uiSchema, existingButtons ? [...existingButtons, ...buttons] : buttons, `${buttonsPath}/ui:options/buttons`);
}

export function dictionarify(array: any[], getKey?: (item: any) => string, getValue?: (item: any) => any) {
	return array.reduce((o, k) => {
		o[getKey ? getKey(k) : k] = getValue ? getValue(k) : true;
		return o;
	}, {});
}

const tableFormatters: {[formatter: string]: (item: any, formatted: React.ReactInstance, options: any, parentProps: any) => React.ReactNode} = {
	unknownTaxon: (item: any, formatted: React.ReactInstance, options: any, parentProps: any = {}) => 
		(isEmptyString(item) || (parentProps.formData || {})[options.idField])
			? formatted
			: (
				<ReactContext.Consumer>{({theme: {Glyphicon}}) =>
					<span>{formatted} <span className="text-warning"><Glyphicon glyph="warning-sign"/></span></span>
				}</ReactContext.Consumer>
			)
};

export function formatValue(props: FieldProps, _formatter?: any, parentProps?: any) {
	let {formData, uiSchema = {}, schema, registry} = props;

	let formatter = undefined;
	let formatterComponent = undefined;
	if (uiSchema["ui:widget"]) formatterComponent = registry.widgets[uiSchema["ui:widget"] as string];
	else if (schema.type === "boolean") formatterComponent = registry.widgets.CheckboxWidget;
	else if (uiSchema["ui:field"]) formatterComponent = registry.fields[uiSchema["ui:field"] as string];

	if (formatterComponent && formatterComponent.prototype && formatterComponent.prototype.formatValue) {
		formatter = formatterComponent.prototype.formatValue;
	} else if (formatterComponent && formatterComponent.prototype && formatterComponent.prototype.__proto__ && formatterComponent.prototype.__proto__.formatValue) {
		formatter = formatterComponent.prototype.__proto__.formatValue;
	}

	const arrayJoiner = (value: React.ReactElement, i: number, length: number, separator = "; ") => {
		const comma = <React.Fragment key={`_${i}`}>{separator}</React.Fragment>;
		return i < length - 1
			? [value, comma] : [value];
	};

	let formatted = formData;
	if (formatter) {
		formatted = formatter(formData, getUiOptions(uiSchema), props, parentProps);
	} else if (isEmptyString(formData)) {
		formatted = "";
	} else if (isMultiSelect(schema)) {
		formatted = formData.map((_val: any) => (schema as any).items.oneOf.find((one: any) => one.const === _val).title).join(", ");
	} else if (schema.type === "object") {
		const keys = Object.keys(formData);
		return keys.map((_col, i) => {
			const child = <React.Fragment key={_col}>{formatValue({...props, schema: (schema as any).properties[_col], uiSchema: uiSchema[_col], formData: formData[_col]})}</React.Fragment>;
			return arrayJoiner(child, i, keys.length);
		});
	} else if (schema.type === "array") {
		formatted = <span className="single-active-array-table-array">{formData.map((_val: any, i: number) => {
			const child = <React.Fragment key={i}>{
				formatValue({...props, schema: (props.schema as any).items, uiSchema: uiSchema.items, formData: _val})
			}</React.Fragment>;

			return arrayJoiner(child, i, formData.length, "; ");
		})}</span>;
	} else if (isSelect(schema)) {
		formatted = isEmptyString(formData) ? formData : (schema as any).oneOf.find((one: any) => one.const === formData).title;
	} else if (schema.type === "boolean") {
		formatted = props.formContext.translations[formData ? "yes" : "no"];
	}

	if (_formatter) {
		formatted = tableFormatters[_formatter.formatter](formData, formatted, _formatter, parentProps);
	}

	return formatted;
}

export const formatErrorMessage = (msg: string) => msg.replace(/^\[.*\]/, "");

export function checkRules(rules: any[], props: FieldProps, cache?: {[key: string]: any}, prop: keyof FieldProps = "formData"): boolean | {passes: boolean, cache: {[key: string]: any}} {
	const passes = (Array.isArray(rules) ? rules : [rules]).every((rule, idx) => {
		let passes;

		// BW compatibility for old string  rule
		if (rule === "isAdmin") {
			rule = {rule: "isAdmin"};
		} else if (rule === "isEdit") {
			rule = {rule: "isEdit"};
		}

		const {field, regexp, valueIn, valueIncludes, valueLengthLessThan, rule: _rule} = rule;
		if (_rule) {
			if (_rule === "isAdmin") {
				passes = props.formContext.uiSchemaContext.isAdmin;
			} else if (_rule === "isEdit") {
				passes = props.formContext.uiSchemaContext.isEdit;
			}
		} else {
			let value = parseJSONPointer(props[prop] || {}, field);
			if (value === undefined) value = "";
			if (regexp) {
				passes = `${value}`.match(new RegExp(regexp));
			} else if (valueIn) {
				if (cache) {
					if (!cache[idx]) {
						cache[idx] = dictionarify(valueIn);
					}
					passes = cache[idx][value];
				} else {
					passes = dictionarify(valueIn)[value];
				}
			} else if (valueIncludes !== undefined) {
				passes = value.includes(valueIncludes);
			} else if (valueLengthLessThan !== undefined) {
				passes = value.length < valueLengthLessThan;
			}
		}
		return rule.complement ? !passes : passes;
	});

	return cache ? {passes, cache} : passes;
}

export function checkArrayRules(rules: any[], props: FieldProps, idx: number, cache?: {[key: string]: any}, prop: keyof FieldProps = "formData"): boolean | {passes: boolean, cache: {[key: string]: any}} {
	const arrayRules = (Array.isArray(rules) ? rules : [rules]).filter(rule => ["isLast", "idx"].some(r => r in rule));
	const passes = arrayRules.every(rule => {
		let passes;
		if ("isLast" in rule) {
			passes = (idx === props.formData.length - 1) === rule.isLast;
		} else if ("idx" in rule) {
			passes = idx === rule.idx;
		}
		if (passes !== undefined) {
			return rule.complement ? !passes : passes;
		}
		return true;
	});
	const nonArrayRules = (Array.isArray(rules) ? rules : [rules]).filter(rule => !arrayRules.includes(rule));
	if (nonArrayRules.length) {
		const nonArrayRulesCheck = checkRules(nonArrayRules, {...props, formData: props.formData[idx]}, cache, prop);
		const allPass = passes && cache ? (nonArrayRulesCheck as any).passes :  nonArrayRulesCheck;
		if (cache) {
			return {passes: allPass, cache};
		} else {
			return allPass;
		}
	} else {
		return cache ? {cache, passes} : passes;
	}
}

export function bringRemoteFormData(formData: any, formContext: FormContext) {
	if (formContext.formDataTransformers) {
		return formContext.formDataTransformers.reduce((formData, {"ui:field": uiField, props: fieldProps}) => {
			const {state = {}} = new fieldProps.registry.fields[uiField]({...fieldProps, formData});
			return state.formData;
		}, formData);
	} else {
		return formData;
	}
}

export function triggerParentComponent(eventName: string, e: React.SyntheticEvent, props: any) {
	if (props && props[eventName]) {
		e.persist && e.persist();
		props[eventName](e);
	}
}

export function parseSchemaFromFormDataPointer(schema: RJSFSchema, pointer: string) {
	const splits = pointer.split("/").filter(s => !isEmptyString(s));
	const value = splits.reduce((o, s)=> {
		if (!isNaN(parseInt(s))) {
			return o.items;
		}
		if (o.type === "array" && (o as any).items.properties[s]) return (o as any).items.properties[s];
		if (o.type === "array") return o.items;
		return (o as any).properties[s];
	}, schema);
	return value;
}

export function parseUiSchemaFromFormDataPointer(uiSchema: any, pointer: string) {
	const splits = pointer.split("/").filter(s => !isEmptyString(s));
	return splits.reduce((o, s) => {
		if (!isNaN(parseInt(s))) {
			return o.items;
		}
		if (o && o.items) return o.items[s];
		return o ? o[s] : {};
	}, uiSchema);
}

export function checkJSONPointer(obj: any, pointer: string) {
	if (!obj) return false;
	const splits = pointer.split("/").filter(s => !isEmptyString(s));
	try {
		let _pointer = obj;
		return splits.every(split => {
			const exists = split in _pointer;
			_pointer = _pointer[split];
			return exists;
		});
	} catch (e) {
		return false;
	}
}

export const JSONPointerToId = (fieldName: string) => fieldName[0] === "/" ? fieldName.replace(/(?!^)\//g, "_").substr(1) : fieldName;

export const idSchemaIdToJSONPointer = (id: string) => id.replace(/root_|_/g, "/");

export function schemaJSONPointer(schema: RJSFSchema, JSONPointer: string) {
	if (JSONPointer[0] !== "/") {
		JSONPointer = `/${JSONPointer}`;
	}

	let schemaPointer: any = schema;
	return JSONPointer.split("/").filter(s => !isEmptyString(s)).reduce((path, s) => {
		if (schemaPointer[s]) {
			schemaPointer = schemaPointer[s];
			return `${path}/${s}`;
		} else if (!isNaN(+s) && schemaPointer.items) {
			schemaPointer = schemaPointer.items;
			return `${path}/items`;
		} else if (schemaPointer.properties && schemaPointer.properties[s]) {
			schemaPointer = schemaPointer.properties[s];
			return `${path}/properties/${s}`;
		}
		return undefined;
	}, "");
}

export function uiSchemaJSONPointer(schema: RJSFSchema, JSONPointer: string) {
	if (JSONPointer[0] !== "/") return JSONPointer;

	let schemaPointer: any = schema;
	return JSONPointer.split("/").filter(s => !isEmptyString(s)).reduce((path, s) => {
		if (schemaPointer[s]) {
			schemaPointer = schemaPointer[s];
			return `${path}/${s}`;
		} else if (schemaPointer.properties && schemaPointer.properties[s]) {
			schemaPointer = schemaPointer.properties[s];
			return `${path}/${s}`;
		} else if (schemaPointer.items.properties && schemaPointer.items.properties[s]) {
			schemaPointer = schemaPointer.items.properties[s];
			return `${path}/items/${s}`;
		} else if (!isNaN(+s) && schemaPointer.items) {
			schemaPointer = schemaPointer.items;
			return `${path}/items`;
		}
		return undefined;
	}, "");
}

export function updateFormDataWithJSONPointer(schemaProps: Pick<FieldProps, "formData" | "registry" | "schema">, value: any, path: string) {
	if (path === "/") {
		return value;
	}
	return updateSafelyWithJSONPointer(schemaProps.formData, value, path, !!"immutably", (__formData, _path) => {
		const schemaPointer = schemaJSONPointer(schemaProps.schema, _path);
		if (schemaPointer === undefined) {
			throw new Error(`Bad JSON Schema pointer '${schemaPointer}!`);
		}
		const _schema = parseJSONPointer(schemaProps.schema, schemaPointer);
		let _default = getDefaultFormState(_schema, undefined, schemaProps.registry.rootSchema);
		if (!_default && _schema.type === "array") {
			return [];
		}
		return _default;
	});
}

let uuid = 0;
export const assignUUID = (item: any, immutably = false) => {
	if (isObject(item) && !item.id && !item._lajiFormId) {
		uuid++;
		if (immutably) {
			return {...item, _lajiFormId: uuid};
		} else {
			item._lajiFormId = uuid;
			return item;
		}
	}
	return item;
};

export const getUUID = (item: any) => item ? (item.id || item._lajiFormId) : undefined;

/**
 * Return item UUID or the parent UUID
 **/
export const getFieldUUID = (props: {formData: any, formContext: FormContext}) => getUUID(props.formData) || props.formContext._parentLajiFormId || "root";

function walkFormDataWithIdTree(_formData: any, tree: any, itemOperator?: (item: any) => void): [any, {[id: string]: true}] {
	const ids: any = {};
	const walk = (_formData: any, tree: any) => {
		if (!tree) return _formData;
		const {_hasId, ..._tree}  = tree;
		if (_hasId && isObject(_formData)) {
			_formData = itemOperator ? itemOperator(_formData) : _formData;
		}
		if (Object.keys(_tree).length && isObject(_formData)) {
			return Object.keys(_formData).reduce((f: any, k) => {
				if (tree[k]) {
					f[k] = walk(_formData[k], tree[k]);
				} else {
					f[k] = _formData[k];
				}
				return f;
			}, {});
		} else if (tree && Array.isArray(_formData)) {
			return _formData.map(item => {
				item = walk(item, tree);
				item = itemOperator ? itemOperator(item) : item;
				if (getUUID(item)) {
					ids[getUUID(item)] = true;
				}
				return item;
			});
		}
		return _formData;
	};
	const formData = walk(_formData, tree);
	return [formData, ids];
}

export function addLajiFormIds(_formData: any, tree: any, immutably = true) {
	const itemOperator = (item: any) => assignUUID(item, immutably);
	return walkFormDataWithIdTree(_formData, tree, itemOperator);
}

export function getAllLajiFormIdsDeeply(_formData: any, tree: any) {
	return walkFormDataWithIdTree(_formData, tree)[1];
}

export function removeLajiFormIds(formData: any, tree: any) {
	const itemOperator = (item: any) => immutableDelete(item, "_lajiFormId");
	return walkFormDataWithIdTree(formData, tree, itemOperator)[0];
}

export function findPointerForLajiFormId(tmpIdTree: any = {}, formData: any, lajiFormId: any): string | undefined {
	if (tmpIdTree._hasId) {
		if (Array.isArray(formData)) {
			for (let idx in (formData || [])) {
				const item = formData[idx];
				if (getUUID(item) === lajiFormId) {
					return "/" + idx;
				}
			}
		} else if (formData && getUUID(formData) === lajiFormId) {
			return "";
		}
	}
	for (const k of Object.keys(tmpIdTree)) {
		if (isObject(formData[k])) {
			const find = findPointerForLajiFormId(tmpIdTree[k], formData[k], lajiFormId);
			if (find !== undefined || find === "") {
				return `/${k}${find}`;
			}
		} else if (Array.isArray(formData[k])) {
			for (const i in formData[k]) {
				const item = formData[k][i];
				const find = findPointerForLajiFormId(tmpIdTree[k], item, lajiFormId);
				if (find !== undefined || find === "") {
					return `/${k}/${i}${find}`;
				}
			}
		}
	}
	return undefined;
}

export function highlightElem(elem?: Element) {
	if (!elem) return;
	if (elem.className.includes(" highlight-error-fire")) elem.className = elem.className.replace(" highlight-error-fire", "");
	window.setTimeout(() => elem.className = `${elem.className} highlight-error-fire`);
}

export function filteredErrors(errorSchema: any) {
	return Object.keys(errorSchema).reduce<any>((_errorSchema, prop) => {
		if (prop === "__errors") {
			if (errorSchema.__errors.length) {
				_errorSchema.__errors = errorSchema.__errors;
			}
			return _errorSchema;
		}
		const errors = filteredErrors(errorSchema[prop]);
		if (Object.keys(errors).length) {
			_errorSchema[prop] = errors;
		}
		return _errorSchema;
	}, {});
}
export function constructTranslations(translations: {[word: string]: {[lang: string]: string}}) {
	let dictionaries: Translations = {fi: {}, en: {}, sv: {}};
	for (let word in translations) {
		for (let lang in translations[word]) {
			const translation = translations[word][lang];
			dictionaries[lang as Lang][word] = decapitalizeFirstLetter(translation);
			dictionaries[lang as Lang][capitalizeFirstLetter(word)] = capitalizeFirstLetter(translation);
		}
	}
	return dictionaries;
}

export function getIdxWithOffset(idx: number, offsets: any, totalOffset: number) {
	let offset = idx in (offsets || {})
		? (offsets || {})[idx]
		: totalOffset;
	return (offset || 0) + idx;
}

export function getIdxWithoutOffset(idx: number, offsets: any, totalOffset: number) {
	let offset = `_${idx}` in (offsets || {})
		? (offsets || {})[`_${idx}`]
		: totalOffset;
	return idx - (offset || 0);
}

export function toJSONPointer(s: string) {
	return s[0] !== "/"
		? "/" + s
		: s;
}

export function getTitle(props: {schema: RJSFSchema, uiSchema: any, name?: string}, idx?: number) {
	let title = props.uiSchema?.["ui:title" ]
		?? props.schema?.title
		?? props.name;

	if (!title?.includes("%{")) {
		return title;
	}

	const formatters = {
		idx: typeof idx === "number" ? idx + 1 : undefined,
		title
	} as any;

	return Object.keys(formatters).reduce((_title, key) => {
		[key, capitalizeFirstLetter(key)].map(key => `%{${key}}`).forEach(replacePattern => {
			while (_title.includes(replacePattern)) {
				const fn = replacePattern[2] === replacePattern[2].toLowerCase() ? 
					decapitalizeFirstLetter : capitalizeFirstLetter;
				_title = _title.replace(replacePattern, fn(`${formatters[key]}`));
			}
		});
		return _title;
	}, title);
}

export const classNames = (...cs: any[]) => cs.filter(s => typeof s === "string").join(" ");

export function translate(translations: ByLang, key: string, params?: {[key: string]: string | undefined}) {
	return Object.keys(params || {}).reduce(
		(translated, param) => translated.replace(new RegExp(`%{${param}}`, "g"), params?.[param] || ""),
		translations[key]
	);
}
