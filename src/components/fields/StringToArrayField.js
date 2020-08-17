import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getUiOptions } from "../../utils";

@VirtualSchemaField
export default class StringToArrayField extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	static getName() {return "StringToArrayField";}

	getStateFromProps(props, propsWithUiOptions) {
		const {formData = ""} = props;
		const {delimiter = " "} = this.getUiOptions();
		const {"ui:disabled": disabled, "ui:readonly": readonly} = props.uiSchema;
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
			uiSchema: {
				"ui:disabled": disabled,
				"ui:readonly": readonly,
				...innerUiSchema
			}
		};
	}

	onChange(formData) {
		const {delimiter = " "} = this.getUiOptions();
		this.props.onChange(formData.filter(v => v).join(delimiter));
	}
}
