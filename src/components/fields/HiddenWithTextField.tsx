import * as React from "react";
import * as PropTypes from "prop-types";
import { FieldProps, JSONSchemaArray, JSONSchemaString } from "../../types";

const HiddenWithTextField = (props: FieldProps<JSONSchemaArray<JSONSchemaString>>) => {
	return (
		<div>{props.uiSchema["ui:options"]?.altText}</div>
	);
};

HiddenWithTextField.propTypes = {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			"altText": PropTypes.string.isRequired
		}).isRequired,
		uiSchema: PropTypes.object
	}).isRequired,
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["object", "array", "string", "number", "boolean", "integer"])
	}).isRequired
};

export default HiddenWithTextField;