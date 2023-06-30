import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getInnerUiSchema, getUiOptions, uiSchemaJSONPointer, updateSafelyWithJSONPointer } from "../../utils";

@VirtualSchemaField
export default class InputWithDefaultValueButtonField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				buttonLabel: PropTypes.string.isRequired,
				buttonField: PropTypes.string.isRequired,
				valueFields: PropTypes.arrayOf(
					PropTypes.shape({
						field: PropTypes.string.isRequired,
						contextFieldForDefaultValue: PropTypes.string.isRequired
					}).isRequired
				)
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object]).isRequired
	}

	static getName() {return "InputWithDefaultValueButtonField";}

	getStateFromProps(props) {
		let {schema, uiSchema} = props;
		const {buttonField, buttonLabel} = getUiOptions(uiSchema);

		const innerUiSchema = getInnerUiSchema(uiSchema);
		const _uiSchemaJSONPointer = uiSchemaJSONPointer(schema, buttonField);
		uiSchema = updateSafelyWithJSONPointer(innerUiSchema, {
			"ui:widget": "InputWithDefaultValueButtonWidget",
			"ui:options": {
				buttonLabel,
				onClick: this.onClick
			},
		}, _uiSchemaJSONPointer);

		return {...props, uiSchema};
	}

	onClick = () => {
		let {uiSchema, formData} = this.props;
		const uiSchemaContext = this.props.formContext.uiSchemaContext || {};

		const {valueFields} = getUiOptions(uiSchema);
		valueFields.forEach(({field, contextFieldForDefaultValue}) => {
			formData = updateSafelyWithJSONPointer(formData, uiSchemaContext[contextFieldForDefaultValue], field);
		});

		this.props.onChange(formData);
	}
}
