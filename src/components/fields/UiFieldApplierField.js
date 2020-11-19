import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getUiOptions, parseJSONPointer, schemaJSONPointer, uiSchemaJSONPointer, updateSafelyWithJSONPointer } from "../../utils";

const functionPropType = PropTypes.shape({
	"ui:field": PropTypes.string.isRequired,
	"ui:options": PropTypes.object
});

@VirtualSchemaField
export default class UiFieldApplierField extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				field: PropTypes.string,
				functions: PropTypes.oneOfType([functionPropType, PropTypes.arrayOf(functionPropType)])
			})
		}),
		formData: PropTypes.object
	}

	constructor(props) {
		super(props);
		this.functions = [];
	}

	static getName() {return "UiFieldApplierField";}

	getFunctions = () => {
		let {functions} = this.getUiOptions();

		if (!Array.isArray(functions)) {
			functions = [functions];
		}
		return functions;
	}

	getStateFromProps(props) {
		if (this.functions.length !== this.getFunctions().length) {
			this.functions = this.functions.slice(0, this.getFunctions().length);
		}
		let {field} = this.getUiOptions();
		console.log(props);
		return this.getFunctions().reduce((props, options, idx) => {
			let {"ui:field": uiField, "ui:options": uiOptions} = options;

			const uiSchemaForField = parseJSONPointer(props.uiSchema, uiSchemaJSONPointer(props.schema, field));
			const propsForField = {
				schema: parseJSONPointer(props.schema, schemaJSONPointer(props.schema, field)),
				uiSchema: {...uiSchemaForField, "ui:options": {...getUiOptions(uiSchemaForField), ...uiOptions}},
				formData: parseJSONPointer(props.formData, field, !!"safe"),
				idSchema: parseJSONPointer(props.idSchema, field),
				errorSchema: parseJSONPointer(props.errorSchema, field, !!"safe") || {},
				registry: props.registry,
				formContext: props.formContext,
				onChange: this.functions[idx] && this.functions[idx].uiField === uiField
					? this.functions[idx].fn.props.onChange
					: (formData) => {
						idx === 0
							? this.combinedOnChange(formData)
							: this.functions[idx - 1].fn.onChange(formData);
					}
			};

			let fn, state;
			if (this.functions[idx] && this.functions[idx].uiField === uiField) {
				fn = this.functions[idx].fn;
				state = fn.getStateFromProps(propsForField);
			} else {
				fn = new props.registry.fields[uiField](propsForField);
				this.functions[idx] = {uiField, fn};
				state = fn.state || {};
			}
			let computedProps = {};
			if ("schema" in state) {
				computedProps.schema = updateSafelyWithJSONPointer(props.schema, state.schema, schemaJSONPointer(props.schema, field));
			}
			if ("uiSchema" in state) {
				computedProps.uiSchema = updateSafelyWithJSONPointer(props.uiSchema, state.uiSchema, uiSchemaJSONPointer(props.schema, field));
			}
			["formData", "idSchema", "errorSchema"].forEach(prop => {
				if (prop in state) {
					computedProps[prop] = updateSafelyWithJSONPointer(props[prop] || {}, state[prop], field);
				}
			});
			console.log({...props, ...computedProps});
			return {...props, ...computedProps};
		}, props);
	}

	onChange(formData) {
		const {field} = this.getUiOptions();
		this.onChangeFormData = formData;
		this.functions[this.functions.length - 1].fn.onChange(parseJSONPointer(formData, field));
	}

	combinedOnChange(formData) {
		const {field} = this.getUiOptions();
		this.props.onChange(updateSafelyWithJSONPointer(this.onChangeFormData, formData, field));
	}
}
