import * as React from "react";
import * as PropTypes from "prop-types";
import { immutableDelete, getDefaultFormState } from "../../utils";
import merge from "deepmerge";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Transforms an object schema containing arrays to an array schema containing objects.
 *
 * uischema = {"ui:options": {
 *  uiSchema: <uiSchema> (uiSchema which is passed to array items)
 * }
 */
@VirtualSchemaField
export default class ArrayCombinerField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				additionalItemsAmount: PropTypes.number
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return "ArrayCombinerField";}

	getStateFromProps(props) {
		const {additionalItemsAmount} = this.getUiOptions();

		let itemSchema = {type: "object", properties: {}, required: props.schema.required};
		let schema = {type: "array"};
		if (additionalItemsAmount) schema.additionalItems = itemSchema;
		if ("title" in props.schema) schema.title = props.schema.title;
		Object.keys(props.schema.properties).forEach((propertyName) => {
			let propertyOrigin = props.schema.properties[propertyName];
			let property = propertyOrigin.items;
			if (property.type === "object" || property.type === "array") throw "items properties can't be objects or arrays";
			if (propertyOrigin.title) property.title = propertyOrigin.title;
			itemSchema.properties[propertyName] = property;
		});

		schema.items = itemSchema;
		if (additionalItemsAmount) {
			schema.items = Array(additionalItemsAmount).fill(itemSchema);
			schema.additionalItems = itemSchema;
		}

		const uiSchema = Object.keys(props.schema.properties).reduce((_uiSchema, field) => {
			if (field in _uiSchema) {
				_uiSchema = {..._uiSchema, items: {...(_uiSchema.items || {}), [field]: _uiSchema[field]}};
				immutableDelete(_uiSchema, field);
			}
			return _uiSchema;
		}, props.uiSchema);

		function objectsToArray(array, objects) {
			if (objects) Object.keys(objects).forEach(dataCol => {
				if (objects[dataCol]) for (var row in objects[dataCol]) {
					let val = objects[dataCol][row];
					if (!array[row]) array[row] = {};
					array[row][dataCol] = val;
				}
			});
			return array;
		}

		function rotateErrorSchema(rotatedErrorSchema, errorSchema) {
			if (errorSchema) Object.keys(errorSchema).forEach(property => {
				const error = errorSchema[property];

				if (property === "__errors") {
					rotatedErrorSchema.__errors = error;
				} else {
					if (error) Object.keys(error).forEach(idx => {
						if (idx === "__errors") {
							rotatedErrorSchema.__errors = rotatedErrorSchema.__errors ?
								[...rotatedErrorSchema.__errors, ...error.__errors] :
								error.__errors;
						} else {
							const propertyError = {[property]: error[idx]};
							rotatedErrorSchema[idx] = rotatedErrorSchema[idx] ?
								merge(rotatedErrorSchema[idx], propertyError) : propertyError;
						}
					});
				}
			});
			return rotatedErrorSchema;
		}

		let errorSchema = rotateErrorSchema({}, props.errorSchema);
		let formData = objectsToArray([], props.formData);
		formData.forEach((obj) => {
			Object.keys(itemSchema.properties).forEach((prop) => {
				if (!(prop in obj)) {
					obj[prop] = getDefaultFormState(itemSchema.properties[prop]);
				}
			});
		});
		return {schema, errorSchema, formData, uiSchema, onChange: this.onChange};
	}

	onChange = (formData) => {
		let origArraysContainer = {};
		if (!formData || formData.length === 0) {
			Object.keys(this.props.schema.properties).forEach((prop) => {
				origArraysContainer[prop] = [];
			});
		} else {
			formData.forEach((obj) => {
				Object.keys(this.props.schema.properties).forEach((arrName) => {
					origArraysContainer[arrName] ?
						origArraysContainer[arrName].push(obj[arrName]) :
						( origArraysContainer[arrName] = [obj[arrName]] );
				});
			});
		}
		this.props.onChange(origArraysContainer);
	}
}
