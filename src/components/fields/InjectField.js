import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Inject a schema object property to nested schema.
 * uiSchema = { "ui:options": {
 *  "injections": [
 *    {
 *      "fields": [field1, field2...],
 *      "target": fieldName
 *    }
 *    ...
 *  ]
 * }}
 */
export default class InjectField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const options = props.uiSchema["ui:options"].injections;

		const fields = options.fields;
		const target = options.target;
		let {schema, uiSchema, idSchema, formData} = props;

		fields.forEach((fieldName) => {
			schema = update(schema, {properties: {[target]: this.getUpdateSchemaPropertiesPath(schema.properties[target], {$merge: {[fieldName]: schema.properties[fieldName]}})}});
			if (schema.required && schema.required.indexOf(fieldName) !== -1) {
				let requiredRoot;
				if (schema.type === "object")
					requiredRoot = schema.properties[target];
				else if (schema.type === "array")
					requiredRoot = schema.properties[target].items;
				else throw "schema is not object or array";
				if (requiredRoot.required) requiredRoot.required.push(fieldName);
				else requiredRoot = [fieldName];
			}
			delete schema.properties[fieldName];

			idSchema = update(idSchema, {[target]: {$merge: {[fieldName]: {id: idSchema[target].id + "_" + fieldName}}}});
			delete idSchema[fieldName];

			formData = update(formData, {});
			if (formData && formData[target] && Array.isArray(formData[target])) {
				formData[target].forEach((item, i) => {
					let updatedItem = update(item, this.getUpdateFormDataPath(formData, fieldName));
					formData = update(formData, {[target]: {[i]: {$set: updatedItem}}});
				});
			} else if (formData && formData[target]) {
				formData = update(formData, {[target]: this.getUpdateFormDataPath(formData, fieldName)});
			}
			delete formData[fieldName];
		});

		uiSchema = update(uiSchema, {});
		delete uiSchema["ui:field"];
		delete uiSchema["ui:options"];

		return {...props, schema, uiSchema, idSchema, formData, onChange: this.onChange};
	}

	onChange = (formData) => {
		const options = this.props.uiSchema["ui:options"].injections;
		const fields = options.fields;
		const target = options.target;

		if (!formData || !formData[target]) {
			formatToOriginal(this.props);
			this.props.onChange(formData);
			return;
		}

		let formDataChanged = false;
		fields.forEach((fieldName) => {
			let originalStringified = JSON.stringify(this.props.formData[fieldName]);
			if (formData && formData[target] && Array.isArray(formData[target])) {
				for (var i in formData[target]) {
					if (i >= this.props.formData[target].length) break;
					let item = formData[target][i];
					if (JSON.stringify(item[fieldName]) !== originalStringified) {
						formData = update(formData, {[fieldName]: {$set: item[fieldName]}});
						formDataChanged = true;
					}
					delete item[fieldName];
				}
			} else if (formData && formData[target] && formData[target][fieldName]) {
				formData = update(formData, {[fieldName]: {$set: formData[target][fieldName]}});
				delete formData[target][fieldName];
				formDataChanged = true;
			}
		});

		if (!formDataChanged) {
			formatToOriginal(this.props);
		}

		this.props.onChange(formData);

		function formatToOriginal(props) {
			fields.forEach((fieldName) => {
				formData[fieldName] = props.formData[fieldName];
			});
		}
	}

	getUpdateSchemaPropertiesPath = (schema, $operation) => {
		if (schema.type === "object") return {properties: $operation};
		else if (schema.type === "array") return {items: {properties: $operation}}
		else throw "schema is not object or array";
	}

	getUpdateFormDataPath = (formData, fieldName) => {
		return {$merge: {[fieldName]: formData[fieldName]}}
	}

	render() {
		return (
			<SchemaField
				{...this.state}
			/>
		)
	}
}
