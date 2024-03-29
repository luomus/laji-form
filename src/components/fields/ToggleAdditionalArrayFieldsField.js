import * as React from "react";
import * as PropTypes from "prop-types";
import {
	getInnerUiSchema,
	getUiOptions,
	updateSafelyWithJSONPointer,
	isDefaultData,
	parseJSONPointer,
	parseSchemaFromFormDataPointer
} from "../../utils";
import BaseComponent from "../BaseComponent";
import getContext from "../../Context";

@BaseComponent
export default class ToggleAdditionalArrayFieldsField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				additionalFields: PropTypes.arrayOf(PropTypes.string).isRequired,
				toggleLabel: PropTypes.string,
				toggleClassName: PropTypes.string,
				toggleHelp: PropTypes.string
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array]).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {visible: this.getInitialVisible(props), ...this.getStateFromProps(props)};
	}

	getTogglePersistenceContextKey = (props) => `$additional_toggle_persistence_${props.idSchema.$id}`

	getInitialVisible(props) {
		const {additionalFields} = getUiOptions(props.uiSchema);

		const context = getContext(props.formContext.contextId);
		let visible = context[this.getTogglePersistenceContextKey(props)] || false;

		if (!visible) {
			for (const data of props.formData) {
				for (const field of additionalFields) {
					if (!isDefaultData(
						parseJSONPointer(data, field),
						parseSchemaFromFormDataPointer(props.schema, field)
					)) {
						visible = true;
						break;
					}
				}
			}
		}

		return visible;
	}

	getStateFromProps(props) {
		const innerUiSchema = getInnerUiSchema(props.uiSchema);
		return {uiSchema: innerUiSchema};
	}

	toggleVisibility = () => {
		const visible = !this.state.visible;
		const context = getContext(this.props.formContext.contextId);
		context[this.getTogglePersistenceContextKey(this.props)] = visible;
		this.setState({visible});
	}


	render() {
		const { CheckboxWidget } = this.props.registry.widgets;
		const { SchemaField } = this.props.registry.fields;

		const {additionalFields = [], toggleLabel, toggleClassName, toggleHelp} = getUiOptions(this.props.uiSchema);

		const shouldShow = Object.values(this.props.errorSchema || {}).some(error =>
			additionalFields.some(field => parseJSONPointer(error, field))
		) || this.state.visible;

		let _uiSchema = this.state.uiSchema;
		if (!shouldShow) {
			additionalFields.forEach(field => {
				_uiSchema = updateSafelyWithJSONPointer(_uiSchema, {"ui:field": "HiddenField"}, "items/" + field);
			});
		}

		return (
			<React.Fragment>
				<SchemaField {...this.props} uiSchema={_uiSchema} />
				<div className={toggleClassName}>
					<CheckboxWidget
						{...this.props}
						id={this.props.idSchema.$id + "_toggle"}
						schema={{type: "boolean"}}
						value={this.state.visible}
						onChange={this.toggleVisibility}
						label={toggleLabel || ""}
						options={{allowUndefined: false, help: toggleHelp}}
						required={false}
					/>
				</div>
			</React.Fragment>);
	}
}
