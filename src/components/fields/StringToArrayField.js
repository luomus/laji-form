import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getUiOptions } from "../../utils";

@VirtualSchemaField
export default class StringToArrayField extends Component {
	static getName() {return "StringToArrayField";}
	getStateFromProps(props, propsWithUiOptions) {
		const {formData = ""} = props;
		console.log("real", formData);
		const {delimiter = " "} = this.getUiOptions();
		console.log("splitted", formData.split(delimiter));
		console.log(propsWithUiOptions);
		const innerUiSchema = getUiOptions(propsWithUiOptions.uiSchema).uiSchema || {};
		return {
			schema: {
				type: "array",
				title: props.schema.title,
				items: {
					...props.schema,
					title: ""
				}
			},
			formData: formData.split(delimiter),
			uiSchema: innerUiSchema
		};
	}

	onChange(formData) {
		const {delimiter = " "} = this.getUiOptions();
		console.log("ON CHNAGE");
		this.props.onChange(formData.join(delimiter));
	}
}
