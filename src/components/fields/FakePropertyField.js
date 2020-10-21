import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { updateSafelyWithJSONPointer } from "../../utils";

@VirtualSchemaField
export default class FakePropertyField extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	static getName() {return "FakePropertyField";}

	getStateFromProps(props) {
		const {fields} = this.getUiOptions();
		let properties = props.schema.properties;
		let uiSchema = props.uiSchema;
		let formData = props.formData;
		let data;
		Object.keys(fields).forEach((prop) => {
			const {schema, uiSchema: _uiSchema, formData: _formData} = fields[prop];
			properties = updateSafelyWithJSONPointer(properties, schema, prop);
			uiSchema = updateSafelyWithJSONPointer(uiSchema, _uiSchema, prop);
			formData = _formData
				?  updateSafelyWithJSONPointer(formData, _formData, prop)
				: formData;
			data = formData[prop];		
		});
		return data ? {
			schema: {
				...props.schema,
				properties
			},
			uiSchema,
			formData
		} : undefined;
	}
}
