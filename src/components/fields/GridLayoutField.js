import React from "react";
import PropTypes from "prop-types";
import { getUiOptions } from "../../utils";

const GridLayoutField = (props) => {
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
GridLayoutField.propTypes = {
	uiSchema: PropTypes.shape({
		"ui:grid": PropTypes.shape({
		 lg: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
		 md: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
		 sm: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
		 xs: PropTypes.oneOfType([PropTypes.number, PropTypes.object])
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["object"])
	}).isRequired
};
export default GridLayoutField;
