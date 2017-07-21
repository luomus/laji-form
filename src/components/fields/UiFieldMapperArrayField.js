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

		props.formData.forEach((item, idx) => {
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

	getStateFromProps(props) {
		const getFieldProp = (field, prop) => field[(prop in field.state) ? "state" : "props"][prop];

		const schema = {...props.schema, items: getFieldProp(this.childInstances[0], "schema")};
		const state = {
			...props,
			schema,
			uiSchema: {...props.uiSchema, items: getFieldProp(this.childInstances[0], "uiSchema")},
			formData: props.formData.map((item, idx) => getFieldProp((this.childInstances[idx]), "formData")),
			idSchema: toIdSchema(schema, props.idSchema.$id, props.registry.definitions)
		};

		return state;
	}

	onChange(formData) {
		this.props.onChange(formData.map((item, idx) => {
			if (!deepEquals(item, this.props.formData[idx])) {
				this.childInstances[idx].onChange(item); // Will trigger child instance onChange, which will set this.tmpItemFormData.

				return this.tmpItemFormData;
			}
			return item;
		}));
	}
}
