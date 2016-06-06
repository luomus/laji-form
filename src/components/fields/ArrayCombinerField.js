import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"

/**
 * Transforms an object schema containing arrays to an array schema containing objects.
 *
 * uischema = {"ui:options": {
 *  uiSchema: <uiSchema> (uiSchema which is passed to array items)
 * }
 */
export default class ArrayCombinerField extends Component {
	constructor(props) {
		super(props);
		this.state = {onChange: this.onChange, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema} = props;
		uiSchema = (uiSchema && uiSchema["ui:options"] && uiSchema["ui:options"].uiSchema) ?
			uiSchema["ui:options"].uiSchema : {};

		let schema = {type: "array", items: {type: "object", properties: {}}};
		if (props.schema.hasOwnProperty("title")) schema.title = props.schema.title;
		Object.keys(props.schema.properties).forEach((propertyName) => {
			let propertyOrigin = props.schema.properties[propertyName];
			let property = propertyOrigin.items;
			if (property.type === "object" || property.type === "array") throw "items properties can't be objects or arrays";
			if (propertyOrigin.title) property.title = propertyOrigin.title;
			schema.items.properties[propertyName] = property;
		});

		function objectsToArray(array, objects) {
			if (objects) Object.keys(objects).forEach((dataCol) => {
				if (objects[dataCol]) for (var row in objects[dataCol]) {
					let val = objects[dataCol][row];
					if (!array[row]) array[row] = {};
					array[row][dataCol] = val;
				}
			});
			return array;
		}
		let errorSchema = objectsToArray({}, props.errorSchema);
		let formData = objectsToArray([], props.formData);
		formData.forEach((obj) => {
			Object.keys(schema.items.properties).forEach((prop) => {
				if (!obj.hasOwnProperty(prop)) {
					obj[prop] = getDefaultFormState(schema.items.properties[prop], undefined, this.props.registry.definitions);
				}
			});
		});
		return {schema, uiSchema, errorSchema, formData};
	}

	onChange = (formData) => {
		let origArraysContainer = {};
		if (!formData || formData.length === 0) {
			Object.keys(this.props.schema.properties).forEach((prop) => {
				origArraysContainer[prop] = [];
			});
		} else {
			formData.forEach((obj) => {
				Object.keys(obj).forEach((arrName) => {
					origArraysContainer[arrName] ?
						origArraysContainer[arrName].push(obj[arrName]) :
						( origArraysContainer[arrName] = [obj[arrName]] );
				});
			});
		}
		this.props.onChange(origArraysContainer);
	}

	render() {
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
