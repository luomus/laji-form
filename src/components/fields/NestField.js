import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Makes it possible to extract fields from object schema and
 * make them act like a nested schema without touching the form data structure.
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
 *      "ui:field": "someField2"
 *      }
 *    },
 *    "inner2": {
 *      "ui:field": "someField3"
 *    }
 *  }
 *
 */
export default class NestField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	sanityCheck = (props) => {
		if (props.schema.type !== "object") throw "ui:options wasn't defined";
		if (!props.uiSchema["ui:options"]) throw "ui:options wasn't defined";
	}

	getStateFromProps = (props) => {
		this.sanityCheck(props);

		let uiSchema = update(props.uiSchema, {$merge: {"ui:field": undefined}});
		let idSchema = props.idSchema;
		let errorSchema = props.errorSchema;
		let formData = props.formData;

		let schemaProperties = props.schema.properties;
		let options = props.uiSchema["ui:options"];
		Object.keys(options).forEach((newFieldName) => {
			schemaProperties = update(schemaProperties, {$merge: {[newFieldName]: getNewSchemaField(options[newFieldName].title)}});
			idSchema = update(idSchema, {$merge: {[newFieldName]: getNewIdSchemaField(idSchema.id, newFieldName)}});
			errorSchema = update(errorSchema, {$merge: {[newFieldName]: {}}});

			options[newFieldName].fields.forEach((fieldName) => {
				schemaProperties[newFieldName].properties[fieldName] = schemaProperties[fieldName];
				idSchema[newFieldName][fieldName] = getNewIdSchemaField(idSchema[newFieldName].id, fieldName);
				errorSchema[newFieldName][fieldName] = errorSchema[fieldName];

				[schemaProperties, idSchema, errorSchema].forEach((schemaFieldProperty) => {
					delete schemaFieldProperty[fieldName];
				})

				if (options[newFieldName].uiSchema) {
					uiSchema[newFieldName] = options[newFieldName].uiSchema;
				}

				if (formData.hasOwnProperty(fieldName)) {
						if (!formData[newFieldName]) {
							formData = update(formData, {$merge: {[newFieldName]: {[fieldName]: formData[fieldName]}}});
						} else {
							formData = update(formData, {[newFieldName]: {$merge: {[fieldName]: formData[fieldName]}}});
							delete formData[fieldName];
						}
				}
			});
		});

		let schema = update(this.props.schema, {properties: {$set: schemaProperties}});
		return {schema, uiSchema, idSchema, errorSchema, formData};

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
					if (formData[prop].hasOwnProperty(nestedProp)) {
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
		return (<SchemaField {...this.props}
			schema={this.state.schema}
			uiSchema={this.state.uiSchema}
			idSchema={this.state.idSchema}
			errorSchema={this.state.errorSchema}
			formData={this.state.formData}
			onChange={this.onChange}/>)
	}
}
