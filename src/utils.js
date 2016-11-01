import update from 'react-addons-update';

export function isHidden(uiSchema, property) {
	if (!uiSchema) return false;
	if (uiSchema[property]) uiSchema = uiSchema[property];
	return !uiSchema || uiSchema["ui:widget"] == "hidden" || uiSchema["ui:field"] == "hidden";
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
	if (!formData) return false;
	else {
		if (!Array.isArray(formData)) formData = [formData];
		return formData.some(data => {
			if (typeof data === "object") return Object.keys(data).some(_field => propertyHasData(_field, data));
			else return (formData !== undefined && formData !== null);
		});
	}
}

export function propertyHasData(field, container) {
	if (!container) return false;
	const data = container[field];
	return !!(data && data !== "" &&
	(data.constructor !== Object || (Object.keys(data).length > 0 && hasData(data))) &&
	(!Array.isArray(data) || data.length > 0));
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
