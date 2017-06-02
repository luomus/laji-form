import { findDOMNode } from "react-dom";
import { isMultiSelect as _isMultiSelect, getDefaultFormState } from "react-jsonschema-form/lib/utils";
import Context from "./Context";
import update from "immutability-helper";
import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";

export function isHidden(uiSchema, property) {
	if (!uiSchema) return false;
	if (uiSchema[property]) uiSchema = uiSchema[property];
	return !uiSchema || uiSchema["ui:widget"] == "HiddenWidget" || uiSchema["ui:field"] == "HiddenField";
}

export function isDefaultData(formData, schema, registry) {
	function propIsDefaultData(field, value) {
		return value === getDefaultFormState(field, undefined, registry);
	}
	if (!Array.isArray(formData)) formData = [formData];
	return formData.some(data => {
		if (typeof data === "object") {
			return Object.keys(data).some(_field => propIsDefaultData(schema.properties[_field], data));
		}
		else return propIsDefaultData(schema, data);
	});
}

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

export function propertyHasData(field, container) {
	if (!container) return false;
	const data = container[field];
	return !!(data &&
	(data.constructor !== Object || (Object.keys(data).length > 0 && hasData(data))) &&
	(!Array.isArray(data) || (data.length > 0 && hasData(data))));
}

export function getUpdateObjectFromPath(path, injection) {
	let update = {};
	let updatePointer = update;
	let lastPathName = "";
	let splittedPath = path.split(".");
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
	if (uiSchema && new Context("VIRTUAL_SCHEMA_NAMES")[uiSchema["ui:field"]] && parentUiSchema["ui:buttons"]) {
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
		"ui:buttons": uiSchema ? undefined : parentUiSchema["ui:buttons"],
		...uiSchema
	};
}

export function isNullOrUndefined(val) {
	return val === null || val === undefined;
}

export function isEmptyString(val) {
	return val === "" || isNullOrUndefined(val);
}

export function parseJSONPointer(object, jsonPointer) {
	return jsonPointer.substring(1).split("/").reduce((o, i)=>o[i], object);
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
tabbableSelectors = tabbableSelectors.map(type => { return `${type}:not(:disabled):not([readonly]):not(.leaflet-control-layers-selector)`; });


export function getTabbableFields(elem, reverse) {
	const fieldsNodeList = elem.querySelectorAll(tabbableSelectors.join(", "));
	let fields = [...fieldsNodeList];

	if (reverse) fields = fields.reverse();
	return fields;
}

export function getSchemaElementById(id) {
	return document.getElementById(`_laji-form_${id}`);
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

export function findNearestParentSchemaElemId(elem) {
	const nearestParentSchemaElem = findNearestParentSchemaElem(elem) || document.getElementById("_laji-form_root");
	return nearestParentSchemaElem.id.replace("_laji-form_", "");
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

	let doFocus = false;
	for (let field of fields) {
		if (field === inputElem) {
			doFocus = true;
			continue;
		}

		if (doFocus) {
			return field;
		}
	}
}

export function focusNextInput(...params) {
	const field = getNextInput(...params);
	if (field) field.focus();
}

export function focusById(id) {
	const elem = getSchemaElementById(id);
	if (elem) {
		const tabbableFields = getTabbableFields(elem);
		if (tabbableFields && tabbableFields.length) {
			tabbableFields[0].focus();
			scrollIntoViewIfNeeded(elem);
			return true; // success status
		}
	}
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

export function getKeyHandlerTargetId(target = "") {
	while (target.match(/%\{(.*)\}/)) {
		const key = /%\{(.*)\}/.exec(target)[1];
		target = target.replace(`%{${key}}`, new Context()[key]);
	}
	return target;
}

export function handleKeysWith(id, keyFunctions = {}, e, additionalParams = {}) {
	if (new Context().blockingLoaderCounter > 0 &&
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

	const _context = new Context();

	const highPriorityHandled = _context.keyHandlers.some(keyHandler => {
		let target = getKeyHandlerTargetId(keyHandler.target);
		if (keyFunctions[keyHandler.fn] && "target" in keyHandler && id.match(target) && keyHandler.conditions.every(condition => condition(e))) {
			if (!handleKey(keyHandler)) {
				e.preventDefault();
				e.stopPropagation();
			}
			return true;
		}
	});

	if (highPriorityHandled) return highPriorityHandled;

	return _context.keyHandlers.some(keyHandler => {
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
