import React, { Component, PropTypes } from "react";
import { getDefaultFormState, shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, getInnerUiSchema } from "../../utils";

/**
 * Transforms an object schema containing arrays to an array schema containing objects.
 *
 * uischema = {"ui:options": {
 *  uiSchema: <uiSchema> (uiSchema which is passed to array items)
 * }
 */
export default class ArrayCombinerField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				uiSchema: PropTypes.object,
				additionalItemsAmount: PropTypes.integer
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
		const uiSchema = getInnerUiSchema(props.uiSchema);
		const {additionalItemsAmount} = getUiOptions(props.uiSchema);

		let itemSchema = {type: "object", properties: {}};
		let schema = {type: "array"};
		if (additionalItemsAmount) schema.additionalItems = itemSchema;
		if (props.schema.hasOwnProperty("title")) schema.title = props.schema.title;
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
			Object.keys(itemSchema.properties).forEach((prop) => {
				if (!obj.hasOwnProperty(prop)) {
					obj[prop] = getDefaultFormState(itemSchema.properties[prop], undefined, this.props.registry.definitions);
				}
			});
		});
		return {schema, uiSchema, errorSchema, formData};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
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
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
