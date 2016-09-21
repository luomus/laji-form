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

