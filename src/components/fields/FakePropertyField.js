import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { updateSafelyWithJSONPointer } from "../../utils";

@VirtualSchemaField
export default class FakePropertyField extends Component {
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
		Object.keys(fields).forEach((prop) => {
			const {schema, uiSchema: _uiSchema, formData: _formData} = fields[prop];
			properties = updateSafelyWithJSONPointer(properties, schema, prop);
			uiSchema = updateSafelyWithJSONPointer(uiSchema, _uiSchema, prop);
			formData = updateSafelyWithJSONPointer(formData, _formData, prop);
		});
		return {
			schema: {
				...props.schema,
				properties
			},
			uiSchema,
			formData
		};
	}
}
