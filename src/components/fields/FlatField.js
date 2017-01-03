import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { toIdSchema, getDefaultFormState } from  "react-jsonschema-form/lib/utils"
import { immutableDelete } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class FlatField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				"fields": PropTypes.arrayOf(PropTypes.string),
			}),
			uiSchema: PropTypes.object
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {onChange: this.onChange, ...this.getStateFromProps(props)};

		const {fields} = this.getUiOptions();
		let {formData} = props;
		let changed = false;
		if (fields) fields.forEach(field => {
			const innerSchema = props.schema.properties[field];
			const isArray = innerSchema.type === "array";
			if (!formData[field]) {
				const defaultItem = getDefaultFormState(
					isArray ?
						{type: "object", properties: innerSchema.items.properties} :
						innerSchema.properties
				);
				formData = {
					...formData,
					[field]: isArray ? [defaultItem] : defaultItem};
				changed = true;
			}
		});
		if (changed) {
			this.filledFormData = formData;
		}
	}

	componentWillMount() {
		if (this.filledFormData) {
			this.props.onChange(this.filledFormData);
			this.filledFormData = undefined;
		}
	}

	getStateFromProps(props) {
		const state = {
			schema: props.schema,
			errorSchema: props.errorSchema,
			formData: props.formData,
		};

		const {fields} = this.getUiOptions();

		fields.forEach(field => {
			const innerSchema = props.schema.properties[field];
			const isArray = innerSchema.type === "array";
			const propertiesName = isArray ? "items" : "properties";
			let properties = innerSchema[propertiesName];
			if (properties.properties) properties = properties.properties;

			if (properties) Object.keys(properties).forEach(innerField => {
				state.schema = update(state.schema, {properties: {$merge: {[`_${field}.${innerField}`]: properties[innerField]}}});
			});
			state.schema.properties = immutableDelete(state.schema.properties, field);

			if (props.formData && props.formData[field]) {
				let innerData = props.formData[field];

				if (!innerData && props.schema.properties[field].type === "object") {
					innerData = getDefaultFormState(props.schema.properties[field], undefined, props.registry);
				}
				else if (!innerData && props.schema.properties[field].type === "array") {
					innerData = [getDefaultFormState(props.schema.properties[field].items, undefined, props.registry)];
				}

				if (Array.isArray(innerData)) {
					innerData = innerData[0];
				}

				Object.keys(innerData).forEach(innerField => {
					state.formData = {...state.formData, [`_${field}.${innerField}`]: innerData[innerField]};
				});
				state.formData = immutableDelete(state.formData, field);
			}

			if (props.errorSchema) {
				Object.keys(props.errorSchema).forEach(errorField => {
					if (errorField === field) {
						if (isArray) {
							Object.keys(props.errorSchema[errorField])
								.filter(key => key !== "__errors")
								.map(key => props.errorSchema[errorField][key]).forEach(error => {
									Object.keys(error).forEach(innerError => {
										state.errorSchema = {
											...state.errorSchema,
											[`_${field}.${innerError}`]: {
												...(state.errorSchema[`_${field}.${innerError}`] || {}),
												...error[innerError]
											}
										};
									});
							});
							state.errorSchema = immutableDelete(state.errorSchema, field);
							if (props.errorSchema[field] && props.errorSchema[field].__errors) {
								state.errorSchema = {...state.errorSchema, __errors: props.errorSchema[field].__errors};
							}
						} else {
							Object.keys(props.errorSchema[errorField]).forEach(innerError => {
								state.errorSchema = {
									...state.errorSchema,
									[`_${field}.${innerError}`]: [
										...(state.errorSchema[`_${field}.${innerError}`] || []),
										...[props.errorSchema[errorField][innerError]]
									]
								};
							});
							state.errorSchema = immutableDelete(state.errorSchema, errorField);
						}
					}
				});
			}
		});

		state.idSchema = toIdSchema(state.schema, props.idSchema.$id, props.registry.definitions);

		return state;
	}

	onChange(formData) {
		const {fields} = this.getUiOptions();
		Object.keys(formData).forEach(item => {
			if (item[0] === "_") fields.forEach(field => {
				if (item.includes(`_${field}.`)) {
					const newItemName = item.replace(`_${field}.`, "");
					const isArray = (this.props.schema.properties[field].type === "array");
					const newItemBase = isArray ?
						((formData[field] && formData[field][0]) ? formData[field][0] : {} || {}) :
						(formData[field] || {});
					const updatedItem = {...newItemBase, [newItemName]: formData[item]};
					formData = {...formData, [field]: isArray ? [updatedItem] : updatedItem};
					formData = immutableDelete(formData, item);
				}
			});
		});
		this.props.onChange(formData);
	}
}
