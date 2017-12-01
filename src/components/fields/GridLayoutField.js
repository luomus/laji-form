import React from "react";
import { getUiOptions } from "../../utils";

export default (props) => {
	let {schema, uiSchema} = props;
	const {SchemaField} = props.registry.fields;
	uiSchema = {
		...uiSchema,
		"ui:grid": uiSchema["ui:options"]
	};
	delete uiSchema["ui:field"];

	if (getUiOptions(uiSchema).label === false) {
		Object.keys(schema.properties).forEach(propertyName => {
			const propertyUiSchema = (uiSchema[propertyName] || {});
			uiSchema[propertyName] = {
				...propertyUiSchema,
				"ui:options": {
					...(propertyUiSchema["ui:options"] || {}),
					label: false
				}
			};
		});
	}

	return <SchemaField {...props} schema={schema} uiSchema={uiSchema} />;
};
