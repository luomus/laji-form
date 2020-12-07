import * as React from "react";
import * as PropTypes from "prop-types";
import update from "immutability-helper";
import { getDefaultFormState, toIdSchema } from  "@rjsf/core/dist/cjs/utils";
import { immutableDelete } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

function getPropName(field, innerField, isArray) {
	return `${field}_${isArray ? "0_" : ""}${innerField}`;
}


@VirtualSchemaField
export default class FlatField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				"fields": PropTypes.arrayOf(PropTypes.string),
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
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

		fields.sort().forEach(field => {
			let innerSchema = state.schema.properties[field];
			const isArray = innerSchema.type === "array";
			if (isArray) innerSchema = innerSchema.items;
			let {properties} = innerSchema;

			if (properties) Object.keys(properties).forEach(innerField => {
				state.schema = update(state.schema, {properties: {$merge: {[getPropName(field, innerField, isArray)]: properties[innerField]}}});
				if (innerSchema.required && innerSchema.required.indexOf(innerField) !== -1) {
					state.schema.required = update(state.schema.required || [], {$push: [getPropName(field, innerField, isArray)]});
				}

				if (state.uiSchema[field]) {
					if (!isArray && state.uiSchema[field][innerField]) {
						state.uiSchema = update(state.uiSchema, {$merge: {[getPropName(field, innerField, isArray)]: state.uiSchema[field][innerField]}});
					} else if (isArray && state.uiSchema[field].items && state.uiSchema[field].items[innerField]) {
						state.uiSchema = update(state.uiSchema, {$merge: {[getPropName(field, innerField, isArray)]: state.uiSchema[field].items[innerField]}});
					}
				}

				state.idSchema = {
					...state.idSchema,
					[field]: toIdSchema(state.schema.properties[field], `${state.idSchema.$id}_${field}`, props.registry.definitions)
				};
				let innerId = state.idSchema[field][innerField].$id;
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

			if (state.formData && state.formData[field]) {
				let innerData = state.formData[field];

				if (!innerData && state.schema.properties[field].type === "object") {
					innerData = getDefaultFormState(state.schema.properties[field], undefined, props.registry);
				} else if (!innerData && state.schema.properties[field].type === "array") {
					innerData = [getDefaultFormState(state.schema.properties[field].items, undefined, props.registry)];
				}

				if (Array.isArray(innerData)) {
					innerData = innerData[0];
				}

				Object.keys(innerData || {}).forEach(innerField => {
					state.formData = {...state.formData, [getPropName(field, innerField, isArray)]: innerData[innerField]};
				});
				state.formData = immutableDelete(state.formData, field);
			}

			if (state.errorSchema) {
				Object.keys(state.errorSchema).forEach(errorField => {
					if (errorField === field) {
						if (isArray) {
							Object.keys(state.errorSchema[errorField])
								.filter(key => key !== "__errors")
								.map(key => state.errorSchema[errorField][key]).forEach(error => {
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
							if (state.errorSchema[field] && state.errorSchema[field].__errors) {
								state.errorSchema = {...state.errorSchema, __errors: state.errorSchema[field].__errors};
							}
						} else {
							Object.keys(state.errorSchema[errorField]).forEach(innerError => {
								state.errorSchema = {
									...state.errorSchema,
									[getPropName(field, innerError, isArray)]: {
										...(state.errorSchema[getPropName(field, innerError, isArray)] || {}),
										...state.errorSchema[errorField][innerError]
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

	_onChange = (formData, schema, fields) => {
		let _fields = [], deepFields = [];
		fields.forEach(f => {
			(f.includes("_") ? deepFields : _fields).push(f);
		});
		Object.keys(formData).sort().forEach(prop => {
			if (prop.includes("_")) _fields.forEach(field => {
				if (prop.includes(`${field}_`)) {
					const isArray = (schema.properties[field].type === "array");
					const newItemName = prop.replace(`${field}_${isArray ? "0_" : ""}`, "");
					const newItemBase = isArray ?
						((formData[field] && formData[field][0]) ? formData[field][0] : {}) :
						(formData[field] || {});
					const updatedItem = {...newItemBase, [newItemName]: formData[prop]};
					formData = {...formData, [field]: isArray ? [updatedItem] : updatedItem};
					formData = immutableDelete(formData, prop);
				}
			});
		});
		deepFields.forEach(deepField => {
			const deepContainerName = deepField.match(/^[^_]*/)[0];
			const deepContainer = formData[deepContainerName][0] || formData[deepContainerName];
			deepField = deepField.replace(/^[^_]*_(0_)?/, "");
			const deepSchema = schema.properties[deepContainerName];
			const changedDeep = this._onChange(deepContainer, deepSchema.items || deepSchema, [deepField]);
			formData = {...formData, [deepContainerName]: deepSchema.type === "array" ? [changedDeep] : changedDeep};
		});
		return formData;
	}

	onChange(formData) {
		const _formData = this._onChange(formData, this.props.schema, this.getUiOptions().fields);
		this.props.onChange(_formData);
	}
}
