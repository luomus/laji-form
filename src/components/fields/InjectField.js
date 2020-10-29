import { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { immutableDelete, parseSchemaFromFormDataPointer, parseUiSchemaFromFormDataPointer, updateFormDataWithJSONPointer, updateSafelyWithJSONPointer } from "../../utils";
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
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return  "InjectField";}

	getStateFromProps(props) {
		const options = this.getUiOptions();
		const {injections} = options;
		let {schema, uiSchema, idSchema, formData, errorSchema} = props;

		(Array.isArray(injections) ? injections : [injections]).forEach((injection) => {
			const {fields, target} = injection;

			fields.forEach((fieldPath) => {
				const splits = fieldPath.split("/").filter(s => s);
				const fieldName = splits[splits.length - 1];

				let parentProperties = this.getSchemaProperties(schema, splits.slice(0, splits.length - 1));
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

				let parentUiSchemaProperties = this.getUiSchemaProperties(uiSchema, splits.slice(0, splits.length - 1));
				uiSchema = updateSafelyWithJSONPointer(uiSchema, parentUiSchemaProperties[fieldName], `/${target}/${fieldName}`);

				const id = fieldPath[0] === "/" ? fieldPath.substr(1).replace(/\//g, "_") : fieldPath;
				idSchema = update(idSchema, {[target]: {$merge: {[fieldName]: {$id: idSchema.$id + "_" + id}}}});
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

				formData = updateFormDataWithJSONPointer({...props, formData}, undefined, splits.join("/"));

				const errors = this.getInnerData(errorSchema, splits);
				if (errors && schema.properties[target].type === "array") {
					if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: []}});
					for (let i = 0; i < formData[target].length; i++) {
						if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: {}}});
						if (!errorSchema[target][i]) errorSchema = update(errorSchema, {[target]: {$merge: {[i]: {}}}});
						errorSchema = update(errorSchema, {[target]: {[i]: {$merge: {[fieldName]: errors}}}});
					}
					errorSchema = immutableDelete(errorSchema, fieldName);
				} else if (errors && schema.properties[target].type === "object") {
					if (!errorSchema[target]) errorSchema = update(errorSchema, {$merge: {[target]: {}}});
					errorSchema = update(errorSchema, {[target]: {$merge: {[fieldName]: errors}}});
				}
			});
		});

		return {schema, uiSchema, idSchema, formData, errorSchema};
	}

	onChange(formData) {
		const options = this.getUiOptions();

		(Array.isArray(options.injections) ? options.injections : [options.injections]).forEach((injection) => {
			const {fields, target} = injection;

			formData = fields.reduce((formData, fieldPointer) => {
				const fieldName = fieldPointer.split("/").pop();
				const value = formData[target][fieldName];
				formData = updateFormDataWithJSONPointer({...this.props, formData}, value, fieldPointer);
				formData = immutableDelete(formData, `/${target}${fieldName[0] === "/" ? fieldName : `/${fieldName}`}`);
				return formData;
			}, formData);
		});

		this.props.onChange(formData);
	}

	getUpdateSchemaPropertiesPath = (schema, $operation) => {
		if (schema.type === "object") return {properties: $operation};
		else if (schema.type === "array") return {items: {properties: $operation}};
		else throw "schema is not object or array";
	}
	getSchemaProperties = (schema, splits) => {
		return parseSchemaFromFormDataPointer(schema, splits.join("/"));
	}
	getUpdateUiSchemaPropertiesPath = (uiSchema, $operation) => {
		return uiSchema.items ? {items: $operation} : $operation;
	}
	getUiSchemaProperties = (uiSchema, splits) => {
		return parseUiSchemaFromFormDataPointer(uiSchema, splits.join("/"));
	}
	getInnerData = (data, splits) => {
		if (!data) return data;
		return splits.reduce((o, s, i) => {
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
