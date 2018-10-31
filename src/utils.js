import React from "react";
import { findDOMNode } from "react-dom";
import { isSelect, isMultiSelect as _isMultiSelect, getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { Glyphicon }  from "react-bootstrap";
import Context from "./Context";
import update from "immutability-helper";
import { isObject as  _isObject } from "laji-map/lib/utils";

export const isObject = _isObject;

export function isHidden(uiSchema, property) {
	if (!uiSchema) return false;
	if (uiSchema[property]) uiSchema = uiSchema[property];
	return !uiSchema || uiSchema["ui:widget"] == "HiddenWidget" || uiSchema["ui:field"] == "HiddenField";
}

export function isDefaultData(formData, schema, definitions = {}) {
	switch (schema.type) {
	case "object":
		return Object.keys(formData || {}).every(field => isDefaultData(formData[field], schema.properties[field], definitions));
	case "array":
		return (Array.isArray(formData) || formData === undefined) && (formData || []).every(item => isDefaultData(item, schema.items, definitions));
	default:
		return formData === getDefaultFormState(schema, undefined, definitions);
	}
}

/**
 * If you use this with schema data, note that this function doesn't check default data.
 */
export function hasData(formData) {
	function hasValue(value)  {
		return value !== undefined && value !== null && value !== "";
	}
	if (!formData && !hasValue(formData)) return false;
	else {
		if (!Array.isArray(formData)) formData = [formData];
		return formData.some(data => {
			if (typeof data === "object") {
				return Object.keys(data).some(_field => propertyHasData(_field, data));
			}
			else return hasValue(data);
		});
	}
}

/**
 * If you use this with schema data, note that this function doesn't check default data.
 */
export function propertyHasData(field, container) {
	if (!container) return false;
	const data = container[field];
	return !!(data &&
	(data.constructor !== Object || (Object.keys(data).length > 0 && hasData(data))) &&
	(!Array.isArray(data) || (data.length > 0 && hasData(data))));
}

export function getUpdateObjectFromJSONPath(path, injection) {
	let update = {};
	let updatePointer = update;
	let lastPathName = "";
	let splittedPath = path.split("/").filter(s => !isEmptyString(s));
	splittedPath.forEach((pathStep, i) => {
		updatePointer[pathStep] = {};
		if (i < splittedPath.length - 1) updatePointer = updatePointer[pathStep];
		lastPathName = pathStep;
	});

	updatePointer[lastPathName] = injection;
	return update;
}

export function immutableDelete(obj, delProp) {
	const newObj = {};
	Object.keys(obj).forEach(prop => {
		if (prop !== delProp) newObj[prop] = obj[prop];
	});
	return newObj;
}

export function getUiOptions(container) {
	if (container) {
		const options = container["ui:options"] || container.options;
		return options ? options : {};
	}
	return {};
}

export function getInnerUiSchema(parentUiSchema) {
	let {uiSchema, ...restOfUiSchema} = parentUiSchema || {};
	if (uiSchema && (new Context("VIRTUAL_SCHEMA_NAMES")[uiSchema["ui:field"]] || new Context("SCHEMA_FIELD_WRAPPERS")[uiSchema["ui:field"]]) && parentUiSchema["ui:buttons"]) {
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

export function isNullOrUndefined(val) {
	return val === null || val === undefined;
}

export function isEmptyString(val) {
	return val === "" || isNullOrUndefined(val);
}

export function parseJSONPointer(object, jsonPointer, safeMode) {
	const splitPath = String(jsonPointer).split("/").filter(s => !isEmptyString(s));
	return splitPath.reduce((o, s, i)=> {
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

export function getReactComponentName(WrappedComponent) {
	return (
		WrappedComponent.displayName ||
		WrappedComponent.name ||
		"Component"
	);
}

export function isMultiSelect(schema, uiSchema) {
	return _isMultiSelect(schema) && !(
		schema.type === "array" &&
		uiSchema &&
		uiSchema.items &&
		uiSchema.items["ui:field"]
	);
}

const SWITCH_CLASS = "bootstrap-switch";

const inputTypes = ["input", "select", "textarea"];
let tabbableSelectors = inputTypes.slice(0);
tabbableSelectors.push(`.${SWITCH_CLASS}:not(.${SWITCH_CLASS}-disabled)`);
tabbableSelectors = tabbableSelectors.map(type => { return `${type}:not([type="hidden"]):not(:disabled):not([readonly]):not([type="file"]):not(.leaflet-control-layers-selector):not(.laji-map-input)`; });

export function getTabbableFields(elem, reverse) {
	const fieldsNodeList = elem.querySelectorAll(tabbableSelectors.join(", "));
	let fields = [...fieldsNodeList];

	if (reverse) fields = fields.reverse();
	return fields;
}

export function getSchemaElementById(contextId, id) {
	return document.getElementById(`_laji-form_${contextId}_${id}`);
}

export function isTabbableInput(elem) {
	return (elem.id.match(/^_laji-form_/) || inputTypes.includes(elem.tagName.toLowerCase()) ||
	elem.className.includes(SWITCH_CLASS));
}

export function canFocusNextInput(root, inputElem) {
	return (findDOMNode(root).querySelectorAll && isTabbableInput(inputElem));
}

export function findNearestParentSchemaElem(elem) {
	while (elem && !("id" in elem ? elem.id : "").match(/^_laji-form_/)) {
		elem = elem.parentNode;
	}
	return elem;
}

export function findNearestParentSchemaElemId(contextId, elem) {
	const nearestParentSchemaElem = findNearestParentSchemaElem(elem) || document.getElementById(`_laji-form_${contextId}_root`);
	return nearestParentSchemaElem ? nearestParentSchemaElem.id.replace(`_laji-form_${contextId}_`, "") : undefined;
}

export function findNearestParentTabbableElem(elem) {
	while (!isTabbableInput(elem)) {
		elem = elem.parentNode;
	}
	return elem;
}

export function getNextInput(formReactNode, inputElem, reverseDirection) {
	const formElem = findDOMNode(formReactNode);
	if (!inputElem) inputElem = findNearestParentTabbableElem(document.activeElement);

	if (!canFocusNextInput(formElem, inputElem)) return;

	const fields = getTabbableFields(formElem, reverseDirection);

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
}

export function focusNextInput(...params) {
	const field = getNextInput(...params);
	if (field) {
		field.focus();
		return true;
	}
	return false;
}

export function focusById(formContext = {}, id, focus = true) {
	const elem = getSchemaElementById(formContext.contextId, id);
	if (elem && document.body.contains(elem)) {
		const tabbableFields = getTabbableFields(elem);
		if (tabbableFields && tabbableFields.length) {
			focus && tabbableFields[0].focus();
			scrollIntoViewIfNeeded(elem, formContext.topOffset, formContext.bottomOffset);
			const _context = new Context(formContext.contextId);
			_context.lastIdToScroll = id; // Mark for components that manipulate height/scroll positions
			_context.windowScrolled = getWindowScrolled();
			return true;
		}
	}
	return false;
}

export function getNestedTailUiSchema(uiSchema) {
	while (uiSchema.uiSchema) {
		uiSchema = uiSchema.uiSchema;
	}
	return uiSchema;
}

export function updateTailUiSchema(uiSchema, updateObject) {
	let tailPointer = {};
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

export function getNestedUiFieldsList(uiSchema) {
	const list = [];
	while (uiSchema.uiSchema && uiSchema.uiSchema["ui:field"]) {
		list.push(uiSchema.uiSchema["ui:field"]);
		uiSchema = uiSchema.uiSchema;
	}
	return list;
}

export function getBootstrapCols(width) {
	return ["lg", "md", "sm", "xs"].reduce((o, c) => {
		o[c] = width;
		return o;
	}, {});
}

export function isDescendant(parent, child) {
	var node = child.parentNode;
	while (node != null) {
		if (node == parent) {
			return true;
		}
		node = node.parentNode;
	}
	return false;
}

export function getKeyHandlerTargetId(target = "", context, formData) { // eslint-disable-line no-unused-vars
	while (target.match(/%\{(.*)\}/)) {
		const path = /%\{(.*)\}/.exec(target)[1];
		if (!path.startsWith("context") && !path.startsWith("formData")) throw Error("Should evaluate 'context' or 'formData'");
		target = target.replace(`%{${path}}`, eval(path));
	}
	return target;
}

export function handleKeysWith(context, id, keyFunctions = {}, e, additionalParams = {}) {
	if (context.blockingLoaderCounter > 0 &&
			!isDescendant(document.querySelector(".pass-block"), e.target)) {
		e.preventDefault();
		return;
	}

	if (isDescendant(document.querySelector(".laji-map"), e.target)) return;

	function handleKey(keyHandler) {
		const returnValue = keyFunctions[keyHandler.fn](e, {...keyHandler, ...additionalParams});
		const eventHandled = returnValue !== undefined ? returnValue : true;
		if (eventHandled) {
			e.preventDefault();
			e.stopPropagation();
		}
		return eventHandled;
	}

	const highPriorityHandled = context.keyHandlers.some(keyHandler => {
		let target = getKeyHandlerTargetId(keyHandler.target, context);
		if (keyFunctions[keyHandler.fn] && "target" in keyHandler && id.match(target) && keyHandler.conditions.every(condition => condition(e))) {
			if (!handleKey(keyHandler)) {
				e.preventDefault();
				e.stopPropagation();
			}
			return true;
		}
	});

	if (highPriorityHandled) return highPriorityHandled;

	return context.keyHandlers.some(keyHandler => {
		if (keyFunctions[keyHandler.fn] && keyHandler.conditions.every(condition => condition(e))) {
			return handleKey(keyHandler);
		}
	});
}

export function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
export function decapitalizeFirstLetter(string) {
	return string.charAt(0).toLowerCase() + string.slice(1);
}

export function stringifyKeyCombo(keyCombo = "") {
	return keyCombo.split("+").map(key => {
		if (key === " ") key = "space";
		return capitalizeFirstLetter(key);
	}).join(" + ");
}

export function canAdd(props) {
	return (!("canAdd" in props) || props.canAdd) && getUiOptions(props.uiSchema).canAdd !== false;
}

export function bsSizeToPixels(bsSize) {
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

export function applyFunction(props) {
	let {"ui:functions": functions, "ui:childFunctions": childFunctions} = (props.uiSchema || {});

	const objectOrArrayAsArray = item => (
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
		const {state = {}} = new props.registry.fields[uiField](_props);
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

export function getWindowScrolled() {
	return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export function scrollIntoViewIfNeeded(elem, topOffset = 0, bottomOffset = 0) {
	if (!elem) return;
	var rect = elem.getBoundingClientRect();
	var html = document.documentElement;
	const height = elem.scrollHeight;
	const inView = (
		rect.top >= topOffset &&
		rect.bottom <= (window.innerHeight || html.clientHeight) - bottomOffset
	);
	const elemTopDistFromViewportTop = rect.top;
	const viewportHeight = (window.innerHeight || html.clientHeight);
	const elemBottomDistFromViewportBottom = -(elemTopDistFromViewportTop + height - viewportHeight);
	const pageScrolled = getWindowScrolled();

	if (inView) return;

	// Priorize scrolling the top of the element into view if showing the bottom would obscure the top of the element.
	if (elemTopDistFromViewportTop <= topOffset) {
		window.scrollTo(0, pageScrolled + elemTopDistFromViewportTop - topOffset);
	} else {
		window.scrollTo(0, pageScrolled - elemBottomDistFromViewportBottom + bottomOffset);
	}
}

export function filter(properties, filter, filterType = "blacklist", getValue) {
	const filterDictionary = {};
	filter.forEach(_enum => { filterDictionary[_enum] = true; });
	const filterFn = (item) => {
		const value = getValue ? getValue(item) : item;
		return filterDictionary[value];
	};
	return properties.filter(filterType === "whitelist" ? filterFn : e => !filterFn(e));
}

export function injectButtons(uiSchema, buttons, buttonsPath) {
	let injectionTarget = false;
	try {
		injectionTarget =	parseJSONPointer(uiSchema, `${buttonsPath}/ui:options`);
	} catch (e) {
		console.error("Invalid buttonsPath for injectButtons()");
	}

	// If path for buttons doesn't exist, we create it (immutably).
	if (!injectionTarget) {
		const splitPath = `${buttonsPath}/ui:options`.split("/").filter(s => !isEmptyString(s));
		let _splitPath = "";
		splitPath.reduce((o, split) => {
			_splitPath += `/${split}`;
			console.log("i love uglifyjs!"); // Fixes an uglifyJS bug on laji.fi-front. You gotta just show some love.
			if (!o[split]) {
				uiSchema = update(uiSchema, getUpdateObjectFromJSONPath(_splitPath, {$set: {}}));
			}
			return o[split];
		}, uiSchema);

		injectionTarget =	parseJSONPointer(uiSchema, `${buttonsPath}/ui:options`);
	}

	const updateTail = {[injectionTarget.buttons ? "$push" : "$set"]: buttons};
	const updateObject = getUpdateObjectFromJSONPath(`${buttonsPath}/ui:options`, {buttons: updateTail});
	uiSchema = update(uiSchema, updateObject);

	return uiSchema;
}

export function dictionarify(array, getKey, getValue) {
	return array.reduce((o, k) => {
		o[getKey ? getKey(k) : k] = getValue ? getValue(k) : true;
		return o;
	}, {});
}

const tableFormatters = {
	unknownTaxon: (item, formatted, options) => {
		return (isEmptyString(item) || item[options.idField]) ? formatted : <span>{formatted} <Glyphicon glyph="warning-sign" bsClass="glyphicon glyphicon-warning-sign text-warning" /></span>;
	}
};
export function formatValue(props, col, _formatter) {
	let {formData, uiSchema, schema, registry} = props;

	schema = schema.properties[col];
	
	const val = formData[col];
	const _uiSchema = uiSchema[col] || getNestedTailUiSchema(uiSchema[col] || {});

	let formatterComponent = undefined;
	if (_uiSchema["ui:widget"]) formatterComponent = registry.widgets[_uiSchema["ui:widget"]];
	else if (schema.type === "boolean") formatterComponent = registry.widgets.CheckboxWidget;
	else if (_uiSchema["ui:field"]) formatterComponent = registry.fields[_uiSchema["ui:field"]];

	let formatter = undefined;
	if (formatterComponent && formatterComponent.prototype && formatterComponent.prototype.formatValue) {
		formatter = formatterComponent.prototype.formatValue;
	} else if (formatterComponent && formatterComponent.prototype && formatterComponent.prototype.__proto__ && formatterComponent.prototype.__proto__.formatValue) {
		formatter = formatterComponent.prototype.__proto__.formatValue;
	}

	let formatted = val;
	if (formatter) {
		formatted = formatter(val, getUiOptions(_uiSchema), props);
	} else if (isEmptyString(val)) {
		formatted = "";
	} else if (isMultiSelect(schema)) {
		formatted = val.map(_val => schema.items.enumNames[schema.items.enum.indexOf(_val)]).join(", ");
	} else if (isSelect(schema)) {
		formatted = isEmptyString(val) ? val : schema.enumNames[schema.enum.indexOf(val)];
	} else if (schema.type === "boolean") {
		formatted = props.formContext.translations[val ? "yes" : "no"];
	}

	if (_formatter) {
		formatted = tableFormatters[_formatter.formatter](formData, formatted, _formatter);
	}

	return formatted;
}

export const formatErrorMessage = msg => msg.replace(/^\[.*\]/, "");

export function checkRules(rules, props, cache, prop = "formData") {
	const passes = (Array.isArray(rules) ? rules : [rules]).every((rule, idx) => {
		if (rule === "isAdmin") {
			return props.formContext.uiSchemaContext.isAdmin;
		} else if (rule === "isEdit") {
			return props.formContext.uiSchemaContext.isEdit;
		} else {
			const {field, regexp, valueIn} = rule;
			let value = parseJSONPointer(props[prop] || {}, field);
			if (value === undefined) value = "";
			if (regexp) {
				return `${value}`.match(new RegExp(regexp));
			} else if (valueIn) {
				if (cache) {
					if (!cache[idx]) {
						cache[idx] = dictionarify(valueIn);
					}
					return cache[idx][value];
				} else {
					return dictionarify(valueIn)[value];
				}
			}
		}
	});

	return cache ? {passes, cache} : passes;
}

export function focusAndScroll(formContext, idToFocus, idToScroll, focus = true) {
	const _context = new Context(formContext.contextId);
	if (idToFocus === undefined && idToScroll === undefined) return;
	if (idToFocus && !focusById(formContext, getKeyHandlerTargetId(idToFocus, _context), focus)) return false;
	if (idToScroll) {
		const elemToScroll = document.getElementById(getKeyHandlerTargetId(idToScroll, _context));
		scrollIntoViewIfNeeded(elemToScroll, formContext.topOffset, formContext.bottomOffset);
	}
	_context.lastIdToScroll = idToScroll;
	_context.windowScrolled = getWindowScrolled();
	return true;
}

export function shouldSyncScroll(formContext) {
	return new Context(formContext.contextId).windowScrolled === getWindowScrolled();
}

export function syncScroll(formContext, force = false) {
	if (force || shouldSyncScroll(formContext)) {
		focusAndScroll(formContext, undefined, new Context(formContext.contextId).lastIdToScroll);
	}
}

export function bringRemoteFormData(formData, formContext) {
	if (formContext.formDataTransformers) {
		return formContext.formDataTransformers.reduce((formData, {"ui:field": uiField, props: fieldProps}) => {
			const {state = {}} = new fieldProps.registry.fields[uiField]({...fieldProps, formData});
			return state.formData;
		}, formData);
	} else {
		return formData;
	}
}

export function triggerParentComponent(eventName, e, props) {
	if (props && props[eventName]) {
		e.persist();
		props[eventName](e);
	}
}
