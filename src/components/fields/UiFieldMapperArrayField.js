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
				"ui:field": PropTypes.string,
			}),
			uiSchema: PropTypes.object
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.childProps = [];
		this.childInstances = [];
		this.updateChildInstances(props);
	}

	componentWillReceiveProps(props) {
		this.updateChildInstances(props);
	}

	updateChildInstances = (props) => {
		const {"ui:field": uiField} = getUiOptions(props.uiSchema);

		(props.formData || []).forEach((item, idx) => {
			const currentFieldProps = this.childProps[idx];
			const nextFieldProps = this.getFieldPropsForIdx(props, idx);
			if (!deepEquals([currentFieldProps, nextFieldProps])) {
				this.childInstances[idx] = new props.registry.fields[uiField](nextFieldProps);
				this.childProps[idx] = nextFieldProps;
			}
		});
	}

	getFieldPropsForIdx = (props, idx) => {
		const {"ui:field": uiField, "ui:options": uiOptions} = getUiOptions(props.uiSchema);
		return {
			...props,
			schema: props.schema.items,
			uiSchema: {"ui:field": uiField, "ui:options": uiOptions, uiSchema: props.uiSchema.items},
			idSchema: toIdSchema(props.schema.items, `${props.idSchema.$id}_${idx}`, props.registry.definitions),
			formData: (props.formData  || [])[idx],
			errorSchema: (props.errorSchema || {})[idx] || {},
			onChange: formData => {
				this.tmpItemFormData = formData;
			}
		};
	}

	getInstanceForIdx = (props, idx) => {
		const {"ui:field": uiField} = getUiOptions(props.uiSchema);
		console.log(props);
		return new props.registry.fields[uiField](this.getFieldPropsForIdx(props, idx));
	}

	getStateFromProps(props, origProps) {
		const templateInstance = this.childInstances && this.childInstances.length ? 
			this.childInstances[0] : 
			this.getInstanceForIdx(origProps, undefined);

		const getFieldProp = (field, prop) => field[(prop in field.state) ? "state" : "props"][prop];

		const schema = {...props.schema, items: getFieldProp(templateInstance, "schema")};
		const state = {
			...props,
			schema,
			uiSchema: {...props.uiSchema, items: {...getFieldProp(templateInstance, "uiSchema"), ...props.uiSchema.items}},
			formData: (props.formData || []).map((item, idx) => getFieldProp((this.childInstances[idx]), "formData")),
			idSchema: toIdSchema(schema, props.idSchema.$id, props.registry.definitions)
		};

		return state;
	}

	onChange(formData) {
		this.props.onChange(formData.map((item, idx) => {
			if (!deepEquals(item, this.props.formData[idx])) {
				const instance = this.childInstances[idx] || this.getInstanceForIdx(this.props, idx);
				instance.onChange(item); // Will trigger child instance onChange, which will set this.tmpItemFormData.
				return this.tmpItemFormData;
			}
			return item;
		}));
	}
}
