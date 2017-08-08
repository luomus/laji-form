import { Component } from "react";
import PropTypes from "prop-types";
import { toIdSchema, deepEquals } from  "react-jsonschema-form/lib/utils";
import { getUiOptions } from  "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class UiFieldMapperArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				functions: PropTypes.oneOfType([
					PropTypes.arrayOf(
						PropTypes.shape({
							"ui:field": PropTypes.string.isRequired,
							"ui:options": PropTypes.object
						}),
					),
					PropTypes.shape({
						"ui:field": PropTypes.string.isRequired,
						"ui:options": PropTypes.object
					})
				])
			}),
			uiSchema: PropTypes.object
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.childProps = [];
		this.functionOutputProps = [];
		this.updateChildProps(props);
	}

	componentWillReceiveProps(props) {
		this.updateChildProps(props);
	}

	updateChildProps = (props) => {
		(props.formData || []).forEach((item, idx) => {
			const currentFieldProps = this.childProps[idx];
			const nextFieldProps = this.getFieldPropsForIdx(props, idx);
			if (!deepEquals([currentFieldProps, nextFieldProps])) {
				this.functionOutputProps[idx] = this.applyFunctionsToChildProps(props, nextFieldProps);
				this.childProps[idx] = nextFieldProps;
			}
		});
	}

	getFieldPropsForIdx = (props, idx) => {
		return {
			...props,
			schema: props.schema.items,
			uiSchema: props.uiSchema.items,
			idSchema: props.idSchema,
			formData: (props.formData || [])[idx],
			errorSchema: (props.errorSchema || {})[idx] || {},
			onChange: formData => {
				this.tmpItemFormData = formData;
			}
		};
	}

	applyFunctionsToChildProps = (props, childProps) => {
		let {functions} = getUiOptions(props.uiSchema);

		return ((Array.isArray(functions)) ? functions : [functions]).reduce((_props, {"ui:field": uiField, "ui:options": uiOptions}) => {
			const {
				"ui:functions": uiFunctions,
				uiSchema,
				"ui:field": origUiField,
				"ui:options": origUiOptions,
				..._propsUiSchema
			} = _props.uiSchema;

			_props = {
				..._props,
				uiSchema: {
					..._propsUiSchema,
					"ui:field": uiField,
					"ui:options": uiOptions
				}
			};

			const {state = {}} = new props.registry.fields[uiField](_props);
			return {
				..._props,
				...state,
				uiSchema: {
					..._props.uiSchema, 
					...state.uiSchema,
					"ui:functions": uiFunctions,
					"ui:field": origUiField,
					"ui:options": origUiOptions,
					uiSchema
				}
			};
		}, childProps);
	}

	getFunctionOutputForIdx = (props, idx) => {
		return this.applyFunctionsToChildProps(props, this.getFieldPropsForIdx(props, idx));
	}

	getStateFromProps(props, origProps) {
		const templateOutput = this.functionOutputProps && this.functionOutputProps.length ? 
			this.functionOutputProps[0] : 
			this.getFunctionOutputForIdx(origProps, undefined);

		const schema = {...props.schema, items: templateOutput.schema};
		const state = {
			...props,
			schema,
			uiSchema: {...props.uiSchema, items: {...props.uiSchema.items, ...templateOutput.uiSchema}},
			formData: (props.formData || []).map((item, idx) => this.functionOutputProps[idx].formData),
			idSchema: templateOutput.idSchema,
			errorSchema: Object.keys((props.errorSchema || {})).reduce((errorSchema, item, idx) => {
				errorSchema[idx] = this.functionOutputProps[idx].errorSchema;
				return errorSchema;
			}, {})
		};

		return state;
	}

	onChange(formData) {
		this.props.onChange(formData.map((item, idx) => {
			if (!deepEquals(item, this.props.formData[idx])) {
				const output = this.functionOutputProps[idx] || this.getFunctionOutputForIdx(this.props, idx);
				output.onChange(item); // Will trigger child instance onChange, which will set this.tmpItemFormData.
				return this.tmpItemFormData;
			}
			return item;
		}));
	}
}
