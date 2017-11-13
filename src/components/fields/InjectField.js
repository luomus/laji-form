import { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { immutableDelete } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";
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
@VirtualSchemaField
export default class InjectField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				injections: PropTypes.shape({
					fields: PropTypes.arrayOf(PropTypes.string).isRequired,
					target: PropTypes.string.isRequired
				}).isRequired,
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	static getName() {return  "InjectField";}

	getStateFromProps(props) {
		const options = this.getUiOptions();
		const {injections} = options;
		const {fields, target} = injections;
		let {schema, idSchema, formData, errorSchema} = props;

		fields.forEach((fieldPath) => {
			const splits = fieldPath.split("/");
			const fieldName = splits[splits.length - 1];

			let parentProperties = this.getSchemaProperties(schema, splits);
			schema = update(schema,
				{properties: {[target]: this.getUpdateSchemaPropertiesPath(schema.properties[target],
                    {$merge: {[fieldName]: parentProperties.properties[fieldName]}})}});
			if (splits.length === 1) parentProperties = schema;
			schema = update(schema, this.getSchemaPath(splits, {properties: {$set: immutableDelete(parentProperties.properties, fieldName)}}));
			const idx = parentProperties.required ? parentProperties.required.indexOf(fieldName) : -1;
			if (idx > -1) {
				schema = update(schema, {properties: {[target]: {required: {$push: [fieldName]}}}});
				schema = update(schema, this.getSchemaPath(splits, {required: {$splice: [[idx, 1]]}}));
			}

			idSchema = update(idSchema, {[target]: {$merge: {[fieldName]: {$id: idSchema.$id + "_" + fieldPath.replace(/\//g, "_")}}}});
			idSchema = update(idSchema, this.getIdSchemaPath(splits, {$set: undefined}));
			if (formData && formData[target] && Array.isArray(formData[target])) {
				formData[target].forEach((item, i) => {
					const data = this.getInnerData(formData, splits);
					let updatedItem = update(item, {$merge: {[fieldName]: null}});
					updatedItem = update(updatedItem, {[fieldName]: {$set: data}});
					formData = update(formData, {[target]: {[i]: {$set: updatedItem}}});
				});
			} else if (formData && formData[target]) {
				const data = this.getInnerData(formData, splits);
				formData = update(formData, {[target]: {$merge: {[fieldName]: null}}});
				formData = update(formData, {[target]: {[fieldName]: {$set: data}}});
			}

			formData = update(formData, this.getFormDataPath(splits, {$set: undefined}));

			const errors = this.getInnerData(errorSchema, splits);
			if (errors && schema.properties[target].type === "array") {
				if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: []}});
				for (let i = 0; i < formData[target].length; i++) {
					if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: {}}});
					if (!errorSchema[target][i]) errorSchema = update(errorSchema, {[target]: {$merge: {[i]: {}}}});
					errorSchema = update(errorSchema, {[target]: {[i]: {$merge: {[fieldName]: errors}}}});
				}
				delete errorSchema[fieldName];
			} else if (errors && schema.properties[target].type === "object") {
				if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: {}}});
				errorSchema = update(errorSchema, {[target]: {$merge: {[fieldName]: errors}}});
			}
		});

		return {schema, idSchema, formData, errorSchema};
	}
	onChange(formData) {
		const options = this.getUiOptions();
		const {fields, target} = options.injections;
		if (!formData || !formData[target]) {
			formData = this.formatToOriginal(formData, this.props, fields);
			this.props.onChange(formData);
			return;
		}
		let formDataChanged = false;
		fields.forEach( fieldPath => {
			const splits = fieldPath.split("/");
			const fieldName = splits[splits.length - 1];
			let originalStringified = JSON.stringify(this.props.formData[fieldName]);
			if (formData && formData[target] && Array.isArray(formData[target])) {
				for (var i in formData[target]) {
					let item = JSON.parse(JSON.stringify(formData[target][i]));
					if (JSON.stringify(item[fieldName]) !== originalStringified) {
						formData = update(formData, this.getFormDataPath(splits, {$set: item[fieldName]}));
						formDataChanged = true;
					}
					delete item[fieldName];
					formData = update(formData, {[target]: {[i]: {$set: item}}});
				}
			} else if (formData && formData[target] && formData[target][fieldName] !== undefined) {
				formData = update(formData, this.getFormDataPath(splits, {$set: formData[target][fieldName]}));
				delete formData[target][fieldName];
				formDataChanged = true;
			}
		});
		if (!formDataChanged) {
			formData = this.formatToOriginal(formData, this.props, fields);
		}
		this.props.onChange(formData);
	}

	formatToOriginal = (formData, props, fields) => {
		fields.forEach((fieldPath) => {
			const splits = fieldPath.split("/");
			const fieldName = splits[splits.length - 1];
			formData = update(formData, this.getFormDataPath(splits, {$set: props.formData[fieldName]}));
		});
		return formData;
	}
	getUpdateSchemaPropertiesPath = (schema, $operation) => {
		if (schema.type === "object") return {properties: $operation};
		else if (schema.type === "array") return {items: {properties: $operation}};
		else throw "schema is not object or array";
	}
	getSchemaProperties = (schema, splits) => {
		return splits.reduce((o, s, i)=> {
			if (i === splits.length - 1) {
				return o;
			}
			if (o.type === "array") return o["items"];
			return o["properties"][s];
		}, schema);
	}
	getInnerData = (data, splits) => {
		if (!data) return data;
		return splits.reduce((o, s, i)=> {
			if (i === splits.length - 1) {
				return o[s];
			}
			return o[s] || {};
		}, data);
	}
	getSchemaPath = (splits, $operation) => {
		const path = {};
		splits.reduce((o, s, i)=> {
			if (i === splits.length - 1) {
				for (let k in $operation) o[k] = $operation[k];
				return $operation;
			} else if (!isNaN(s)) {
				o["items"] = {};
				return o["items"];
			} else {
				o["properties"] = {};
				o["properties"][s] = {};
				return o["properties"][s];
			}
		}, path);
		return path;
	}
	getFormDataPath = (splits, $operation) => {
		const path = {};
		splits.reduce((o, s, i)=> {
			if (i === splits.length - 1) {
				o[s] = $operation;
			} else {
				o[s] = {};
			}
			return o[s];
		}, path);
		return path;
	}

	getIdSchemaPath = (splits, $operation) => {
		const path = {};
		splits.reduce((o, s, i)=> {
			if (i === splits.length - 1) {
				o[s] = $operation;
			} else if (isNaN(s)) {
				o[s] = {};
				return o[s];
			}
			return o;
		}, path);

		return path;
	}
}
