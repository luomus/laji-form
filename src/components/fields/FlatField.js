import { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
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

	static getName() {return "FlatField";}

	getStateFromProps(props, origProps) {
		const state = {
			schema: props.schema,
			uiSchema: props.uiSchema,
			errorSchema: props.errorSchema,
			formData: props.formData,
			idSchema: props.idSchema
		};

		const {fields} = this.getUiOptions();

		fields.forEach(field => {
			let innerSchema = props.schema.properties[field];
			const isArray = innerSchema.type === "array";
			if (isArray) innerSchema = innerSchema.items;
			let {properties} = innerSchema;

			if (properties) Object.keys(properties).forEach(innerField => {
				state.schema = update(state.schema, {properties: {$merge: {[getPropName(field, innerField, isArray)]: properties[innerField]}}});
				if (innerSchema.required && innerSchema.required.indexOf(innerField) !== -1) {
					state.schema.required = update(state.schema.required || [], {$push: [getPropName(field, innerField, isArray)]});
				}

				if (props.uiSchema[field]) {
					if (!isArray && props.uiSchema[field][innerField]) {
						state.uiSchema = update(state.uiSchema, {$merge: {[getPropName(field, innerField, isArray)]: props.uiSchema[field][innerField]}});
					} else if (isArray && props.uiSchema[field].items && props.uiSchema[field].items[innerField]) {
						state.uiSchema = update(state.uiSchema, {$merge: {[getPropName(field, innerField, isArray)]: props.uiSchema[field].items[innerField]}});
					}
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
				} else if (!innerData && props.schema.properties[field].type === "array") {
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

		const {formDataTransformers = []} = props.formContext;
		state.formContext = {
			...props.formContext, 
			formDataTransformers: [
				...formDataTransformers, 
				{"ui:field": "FlatField", props: origProps}
			]};

		return state;
	}

	onChange(formData) {
		const {fields} = this.getUiOptions();
		Object.keys(formData).forEach(prop => {
			if (prop.includes("_")) fields.forEach(field => {
				if (prop.includes(`${field}_`)) {
					const isArray = (this.props.schema.properties[field].type === "array");
					const newItemName = prop.replace(`${field}_${isArray ? "0_" : ""}`, "");
					const newItemBase = isArray ?
						((formData[field] && formData[field][0]) ? formData[field][0] : {} || {}) :
						(formData[field] || {});
					const updatedItem = {...newItemBase, [newItemName]: formData[prop]};
					formData = {...formData, [field]: isArray ? [updatedItem] : updatedItem};
					formData = immutableDelete(formData, prop);
				}
			});
		});
		this.props.onChange(formData);
	}
}
