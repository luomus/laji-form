import { Component } from "react";
import VirtualSchemaField from "../VirtualSchemaField";
import { getUiOptions } from "../../utils";

@VirtualSchemaField
export default class StringToArrayField extends Component {
	static getName() {return "StringToArrayField";}
	getStateFromProps(props, propsWithUiOptions) {
		const {formData = ""} = props;
		const {delimiter = " "} = this.getUiOptions();
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
		this.props.onChange(formData.join(delimiter));
	}
}
