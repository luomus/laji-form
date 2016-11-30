import React from "react";
import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";

export default props => (
	<ArrayField
		{...props}
		uiSchema={{...props.uiSchema, "ui:options": { orderable: false, ...props.uiSchema["ui:options"]}}}
	/>
);