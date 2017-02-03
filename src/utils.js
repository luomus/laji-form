import { findDOMNode } from "react-dom";
import { isMultiSelect as _isMultiSelect } from "react-jsonschema-form/lib/utils";
export function isHidden(uiSchema, property) {
	if (!uiSchema) return false;
	if (uiSchema[property]) uiSchema = uiSchema[property];
	return !uiSchema || uiSchema["ui:widget"] == "HiddenWidget" || uiSchema["ui:field"] == "HiddenField";
}

export function getFieldsFinalUiSchema(uiSchema, field) {
	let uiSchemaPointer = uiSchema;
	while (uiSchemaPointer) {
		if (uiSchemaPointer[field]) return uiSchemaPointer[field];
		const options = uiSchemaPointer["ui:options"];
		if (options && options.uiSchema) {
			uiSchemaPointer = options.uiSchema;
		} else {
			uiSchemaPointer = undefined;
		}
	}
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
	let splittedPath = path.split('.');
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
	const {uiSchema, ...restOfUiSchema} = parentUiSchema || {};
	return {
		...restOfUiSchema,
		"ui:field": undefined,
		"ui:buttons": undefined,
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
	return jsonPointer.substring(1).split('/').reduce((o, i)=>o[i], object);
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
tabbableSelectors = tabbableSelectors.map(type => { return `${type}:not(:disabled)` });


export function getTabbableFields(elem, reverse) {
	// const formElem = findDOMNode(elem);

	const fieldsNodeList = elem.querySelectorAll(tabbableSelectors.join(", "));
	let fields = [...fieldsNodeList];

	if (reverse) fields = fields.reverse();
	return fields;
}

export function getSchemaElementById(id) {
	return document.getElementById(`_laji-form_${id}`);
}

export function canFocusNextInput(root, inputElem) {
	function isTabbableInput(elem) {
		return (inputTypes.includes(elem.tagName.toLowerCase()) ||
		elem.className.includes(SWITCH_CLASS))
	}

	return (findDOMNode(root).querySelectorAll && isTabbableInput(inputElem));
}

export function getNearestSchemaElemID(elem) {
	while (!elem.id.match(/^_laji-form_/)) {
		elem = elem.parentElement;
	}
	return elem;
}
