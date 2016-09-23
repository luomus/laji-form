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
		return formData.some(data => Object.keys(data).some(_field => propertyHasData(_field, data)));
	}
}

export function propertyHasData(field, container) {
	if (!container) return false;
	const data = container[field];
	return (data && data !== "" &&
	(data.constructor !== Object || (Object.keys(data).length > 0 && hasData(data))) &&
	(!Array.isArray(data) || data.length > 0));
}
