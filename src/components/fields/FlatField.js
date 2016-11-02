import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { immutableDelete } from "../../utils";

export default class FlatField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				"fields": PropTypes.arrayOf(PropTypes.string),
				uiSchema: PropTypes.object
			})
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {onChange: this.onChange, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const state = {
			schema: props.schema,
			uiSchema: props.uiSchema,
			errorSchema: props.errorSchema,
			formData: props.formData
		};

		const options = props.uiSchema["ui:options"];

		options.fields.forEach(field => {
			const innerSchema = props.schema.properties[field];
			const isArray = !innerSchema.properties;
			const propertiesName = isArray ? "items" : "properties";
			let properties = innerSchema[propertiesName];
			if (properties.properties) properties = properties.properties;

			if (properties) Object.keys(properties).forEach(innerField => {
				state.schema = update(state.schema, {properties: {$merge: {[`_${field}.${innerField}`]: properties[innerField]}}});
			});
			state.schema.properties = immutableDelete(state.schema.properties, field);

			if (props.formData && props.formData[field]) {
				let innerData = props.formData[field];
				if (Array.isArray(innerData)) {
					innerData = innerData[0];
				}

				Object.keys(innerData).forEach(innerField => {
					state.formData = update(state.formData, {$merge: {[`_${field}.${innerField}`]: innerData[innerField]}});
				});
				state.formData = immutableDelete(state.formData, field);
			}

			if (props.errorSchema) {
				Object.keys(props.errorSchema).forEach(errorField => {
					if (errorField === field) {
						if (isArray) {
							Object.keys(props.errorSchema[errorField]).map(key => props.errorSchema[errorField][key]).forEach(error => {
								Object.keys(error).forEach(innerError => {
									state.errorSchema = update(state.errorSchema,
										{$merge: {[`_${field}.${innerError}`]: (state.errorSchema[`_${field}.${innerError}`] || []).concat([error[innerError]])}});
								});
							});
							state.errorSchema = immutableDelete(state.formData, field);
						} else {
							Object.keys(props.errorSchema[errorField]).forEach(innerError => {
								state.errorSchema = update(state.errorSchema,
									{$merge: {[`_${field}.${innerError}`]: (state.errorSchema[`_${field}.${innerError}`] || []).concat([props.errorSchema[errorField][innerError]])}});
							});
							state.errorSchema = immutableDelete(state.errorSchema, errorField);
						}
					}
				});
			}
		});

		if (options.uiSchema) state.uiSchema = options.uiSchema;

		state.idSchema = toIdSchema(state.schema, props.idSchema.$id, props.registry.definitions);

		return state;
	}

	onChange = (formData) => {
		const options = this.props.uiSchema["ui:options"];
		Object.keys(formData).forEach(item => {
			if (item[0] === "_") options.fields.forEach(field => {
				if (item.includes(`_${field}.`)) {
					const newItemName = item.replace(`_${field}.`, "");
					const isArray = (this.props.schema.properties[field].type === "array");
					const newItemBase = isArray ?
						((formData[field] && formData[field][0]) ? formData[field][0] : {} || {}) :
						(formData[field] || {});
					const updatedItem = update(newItemBase, {$merge: {[newItemName]: formData[item]}});
					formData = update(formData, isArray ?
						{[field]: {$set: [updatedItem]}} :
						{$merge: {[field]: updatedItem}}
					);
					formData = immutableDelete(formData, item);
				}
			});
		});
		this.props.onChange(formData);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}

}
