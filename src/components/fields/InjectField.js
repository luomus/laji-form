import React, { Component, PropTypes } from "react";
import update from "react-addons-update";

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
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				injections: PropTypes.shape({
					fields: PropTypes.arrayOf(PropTypes.string).isRequired,
					target: PropTypes.string.isRequired
				}).isRequired,
				uiSchema: PropTypes.object
			}).isRequired
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
		const options = props.uiSchema["ui:options"];
		const injections = options.injections;

		const fields = injections.fields;
		const target = injections.target;
		let {schema, uiSchema, idSchema, formData, errorSchema} = props;

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

			idSchema = update(idSchema, {[target]: {$merge: {[fieldName]: {$id: idSchema[target].$id + "_" + fieldName}}}});
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

			if (errorSchema[fieldName] && schema.properties[target].type === "array") {
				if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: []}});
				for (let i = 0; i < formData[target].length; i++) {
					let error = errorSchema[fieldName];
					if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: {}}});
					if (!errorSchema[target][i]) errorSchema = update(errorSchema, {[target]: {$merge: {[i]: {}}}});
					errorSchema = update(errorSchema, {[target]: {[i]: {$merge: {[fieldName]: error}}}});
				}
				delete errorSchema[fieldName];
			} else if (errorSchema[fieldName] && schema.properties[target].type === "object") {
				if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: {}}});
				let error = errorSchema[fieldName];
				if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: {}}});
				errorSchema = update(errorSchema, {[target]: {$merge: {[fieldName]: error}}});
			}
		});

		//let options = uiSchema["ui:options"];
		if (options && options.uiSchema) {
			uiSchema = update(uiSchema, {$merge: {["ui:field"]: options.uiSchema["ui:field"]}})
			uiSchema = update(uiSchema, {$merge: {["ui:options"]: options.uiSchema["ui:options"]}})
		} else {
			uiSchema = update(uiSchema, {});
			delete uiSchema["ui:field"];
			delete uiSchema["ui:options"];
		}
		//uiSchema = update(uiSchema, {});
		//delete uiSchema["ui:field"];
		//delete uiSchema["ui:options"];
		return {schema, uiSchema, idSchema, formData, errorSchema};
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
		fields.forEach( fieldName => {
			let originalStringified = JSON.stringify(this.props.formData[fieldName]);
			if (formData && formData[target] && Array.isArray(formData[target])) {
				for (var i in formData[target]) {
					let item = JSON.parse(JSON.stringify(formData[target][i]));
					if (JSON.stringify(item[fieldName]) !== originalStringified) {
						formData = update(formData, {[fieldName]: {$set: item[fieldName]}});
						formDataChanged = true;
					}
					delete item[fieldName];
					formData = update(formData, {[target]: {[i]: {$set: item}}});
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
				formData = update(formData, {$merge: {[fieldName]: props.formData[fieldName]}});
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
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<SchemaField {...this.props} {...this.state} />
		)
	}
}
