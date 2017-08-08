import { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { toIdSchema, getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import { immutableDelete } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

function getPropName(field, innerField, isArray) {
	return `${field}_${isArray ? "0_" : ""}${innerField}`;
}


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

	getStateFromProps(props) {
		const state = {
			schema: props.schema,
			uiSchema: props.uiSchema,
			errorSchema: props.errorSchema,
			formData: props.formData,
			idSchema: props.idSchema
		};

		const {fields} = this.getUiOptions();

		fields.forEach(field => {
			const innerSchema = props.schema.properties[field];
			const isArray = innerSchema.type === "array";
			const propertiesName = isArray ? "items" : "properties";
			let properties = innerSchema[propertiesName];
			if (properties.properties) properties = properties.properties;

			if (properties) Object.keys(properties).forEach(innerField => {
				state.schema = update(state.schema, {properties: {$merge: {[getPropName(field, innerField, isArray)]: properties[innerField]}}});

				if (props.uiSchema[field] && props.uiSchema[field][innerField]) {
					state.uiSchema = update(state.uiSchema, {$merge: {[getPropName(field, innerField, isArray)]: props.uiSchema[field][innerField]}});
				}

				let innerId = props.idSchema[field][innerField].$id;
				if (isArray) {
					innerId = innerId.replace(/(.*)_(.*)$/, "$1_0_$2");
				}
				state.idSchema = update(state.idSchema, {$merge: {[getPropName(field, innerField, isArray)]: {$id: innerId}}});
			});
			state.schema.properties = immutableDelete(state.schema.properties, field);
			state.idSchema = immutableDelete(state.idSchema, field);

			const {"ui:order": order= []} = state.uiSchema;
			const orderIdxs = order.reduce((obj, field, idx) => {
				obj[field] = idx;
				return obj;
			}, {});

			if (field in orderIdxs) {
				const head = order.slice(0, orderIdxs[field]);
				const tail = order.slice(orderIdxs[field] + 1);
				state.uiSchema["ui:order"] = [...head, ...Object.keys(properties).map(innerField => getPropName(field, innerField, isArray)), ...tail];
			}

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

				Object.keys(innerData || {}).forEach(innerField => {
					state.formData = {...state.formData, [getPropName(field, innerField, isArray)]: innerData[innerField]};
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
											[getPropName(field, innerError, isArray)]: {
												...(state.errorSchema[getPropName(field, innerError, isArray)] || {}),
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
									[getPropName(field, innerError, isArray)]: {
										...(state.errorSchema[getPropName(field, innerError, isArray)] || {}),
										...props.errorSchema[errorField][innerError]
									}
								};
							});
							state.errorSchema = immutableDelete(state.errorSchema, errorField);
						}
					}
				});
			}
		});

		return state;
	}

	onChange(formData) {
		const {fields} = this.getUiOptions();
		Object.keys(formData).forEach(item => {
			if (item.includes("_")) fields.forEach(field => {
				if (item.includes(`${field}_`)) {
					const newItemName = item.replace(`${field}_`, "");
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
