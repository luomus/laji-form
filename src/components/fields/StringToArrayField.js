import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getUiOptions, getInnerUiSchema } from "../../utils";

@VirtualSchemaField
export default class StringToArrayField extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		formData: PropTypes.string
	}

	static getName() {return "StringToArrayField";}

	getStateFromProps(props) {
		const {formData = ""} = props;
		const {delimiter = " "} = this.getUiOptions();
		const {"ui:disabled": disabled, "ui:readonly": readonly} = props.uiSchema;
		const innerUiSchema = getInnerUiSchema(props.uiSchema);
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
