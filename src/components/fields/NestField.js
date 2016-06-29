import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Makes it possible to extract fields from object schema and
 * make them act like a nested schema without touching the form data structure.
 *
 * uiSchema = {
 *  title: <string>,
 *  ui:options: {
 *    fieldName: {
 *      fields: [<string>],
 *      title: <string>,
 *    }
 *  }
 * }
 *
 * Example usage:
 *
 * schema = {
 *  "type": "object",
 *  "properties": {
 *    "inner_1" { "type": "string" },
 *    "inner_2": { "type": "string" },
 *    "innerOfInner_1": { "type": "string" },
 *    "innerOfInner_2": { "type": "string" },
 *    "secondInner_1" { "type": "string" },
 *    "secondInner_2": { "type": "string" },
 *    "outer_2": { "type": "string" }
 *  }
 *
 *  uiSchema = {
 *    "ui:field": "nest",
 *    "ui:options": {
 *      "inner": {
 *        "fields": ["inner_1", "inner_2"],
 *        "title": "title of inner",
 *        "uiSchema": {
 *          "ui:field": "someField"
 *          "inner_1": {
 *            "ui:field": "someField2"
 *          }
 *        }
 *      },
 *      "secondInner": {
 *        "fields": ["secondInner_1", "secondInner_2"],
 *        "uiSchema": {
 *          "ui:field": "someField3"
 *        }
 *    }
 *  }
 *
 *  would make the schemas look like this:
 *
 *  schema = {
 *    "type": "object",
 *    "properties": {
 *      "inner": {
 *        "type": "object",
 *        "title": "title of inner",
 *        "properties": {
 *          "inner_1": {
 *            "type": "string"
 *          },
 *          "inner_2": {
 *            "type": "string"
 *          }
 *        }
 *      },
 *      "inner2": {
 *        "type: "object",
 *        "properties": {
 *          "secondInner_1": {
 *            "type": "string"
 *          },
 *          "secondInner_2": {
 *            "type": "string"
 *          }
 *        }
 *      },
 *    }
 *  }
 *
 *  uiSchema = {
 *    "inner": {
 *      "ui:field": "someField"
 *      "inner_1": {
 *        "ui:field": "someField2"
 *      }
 *    },
 *    "inner2": {
 *      "ui:field": "someField3"
 *    }
 *  }
 *
 */
export default class NestField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": function(props, propName, componentName) {
				for (let optionProp in props["ui:options"]) {
					const prop = props["ui:options"][optionProp];
					if (!prop.fields || !Array.isArray(prop.fields)) return new Error("Required prop '" + propName + "." + optionProp + ".fields' was not specified in '" + componentName + "'")
				}
			}
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	sanityCheck = (props) => {
		if (props.schema.type !== "object") throw "schema type must be 'object'";
		if (!props.uiSchema["ui:options"]) throw "ui:options wasn't defined";
	}

	getStateFromProps = (props) => {
		this.sanityCheck(props);

		let uiSchema = update(props.uiSchema, {$merge: {"ui:field": undefined}});
		let idSchema = props.idSchema;
		let errorSchema = props.errorSchema;
		let formData = props.formData;
		let schemaProperties = props.schema.properties;

		let requiredDictionarified = {};
		if (props.schema.required) props.schema.required.forEach((req) => {
			requiredDictionarified[req] = true;
		});

		let options = props.uiSchema["ui:options"];
		Object.keys(options).forEach((wrapperFieldName) => {
			schemaProperties = update(schemaProperties, {$merge: {[wrapperFieldName]: getNewSchemaField(options[wrapperFieldName].title)}});
			idSchema = update(idSchema, {$merge: {[wrapperFieldName]: getNewIdSchemaField(idSchema.id, wrapperFieldName)}});
			errorSchema = update(errorSchema, {$merge: {[wrapperFieldName]: {}}});

			options[wrapperFieldName].fields.forEach((fieldName) => {
				schemaProperties[wrapperFieldName].properties[fieldName] = schemaProperties[fieldName];
				if (requiredDictionarified[fieldName]) {
					schemaProperties[wrapperFieldName].required ?
						schemaProperties[wrapperFieldName].required.push(fieldName) :
						(schemaProperties[wrapperFieldName].required = [fieldName])
				}
				idSchema[wrapperFieldName][fieldName] = getNewIdSchemaField(idSchema[wrapperFieldName].id, fieldName);
				errorSchema[wrapperFieldName][fieldName] = errorSchema[fieldName];

				[schemaProperties, idSchema, errorSchema].forEach((schemaFieldProperty) => {
					delete schemaFieldProperty[fieldName];
				});

				if (options[wrapperFieldName].uiSchema) {
					uiSchema[wrapperFieldName] = options[wrapperFieldName].uiSchema;
				}

				if (formData && formData.hasOwnProperty(fieldName)) {
						if (!formData[wrapperFieldName]) {
							formData = update(formData, {$merge: {[wrapperFieldName]: {[fieldName]: formData[fieldName]}}});
						} else {
							formData = update(formData, {[wrapperFieldName]: {$merge: {[fieldName]: formData[fieldName]}}});
							delete formData[fieldName];
						}
				}
			});
		});

		let schema = update(this.props.schema, {properties: {$set: schemaProperties}});
		return {schema, uiSchema, idSchema, errorSchema, formData, onChange: this.onChange};

		function getNewSchemaField(title) {
			return {type: "object", properties: {}, title};
		}
		function getNewIdSchemaField(id, fieldName) {
			return {id: id + "_" + fieldName};
		}
	}

	onChange = (formData) => {
		this.sanityCheck(this.props);
		let options = this.props.uiSchema["ui:options"];

		let dictionarifiedNests = {};
		Object.keys(this.props.uiSchema["ui:options"]).forEach((newFieldName) => {
			dictionarifiedNests[newFieldName] = true;
		});
		let cloned = false;
		Object.keys(formData).forEach((prop) => {
			if (dictionarifiedNests[prop]) {
				Object.keys(formData[prop]).forEach((nestedProp) => {
					if (formData && formData[prop] && formData[prop].hasOwnProperty(nestedProp)) {
						if (cloned) {
							cloned = true;
							formData = update(formData, {$merge: {nestedProp: formData[prop][nestedProp]}});
						} else {
							formData[nestedProp] = formData[prop][nestedProp];
						}
					}
				});
				delete formData[prop];
			}
		});
		this.props.onChange(formData);
	}

	render() {
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
