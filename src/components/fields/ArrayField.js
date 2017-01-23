import React from "react";
import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";

export default props => {
	let {schema} = props;
	if (props.uiSchema.items && props.uiSchema.items["ui:field"]) {
		schema = {...schema, uniqueItems: false};
	}
	return <ArrayField
		{...props}
		schema={schema}
		uiSchema={{...props.uiSchema, "ui:options": { orderable: false, ...props.uiSchema["ui:options"]}}}
	/>
};