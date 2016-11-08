import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, getInnerUiSchema, immutableDelete } from "../../utils";

/**
 * Makes it possible to extract fields from object schema and
 * make them act like a nested schema without touching the form data structure.
 *
 * uiSchema = {
 *  title: <string>,
 *  ui:options: {
 *    nests: {
 *      fieldName: {
 *       fields: [<string>],
 *       title: <string>,
 *      }
 *    },
 *    uiSchema: <uiSchema>
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
 *      "nests": {
 *        "inner": {
 *          "fields": ["inner_1", "inner_2"],
 *          "title": "title of inner",
 *          "uiSchema": {
 *            "ui:field": "someField"
 *            "inner_1": {
 *              "ui:field": "someField2"
 *            }
 *          }
 *        },
 *        "secondInner": {
 *          "fields": ["secondInner_1", "secondInner_2"],
 *          "uiSchema": {
 *            "ui:field": "someField3"
 *          }
 *        }
 *      },
 *      "uiSchema": {
 *        "ui:field": "container"
 *      }
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
 *    "ui:field": "container",
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
			"ui:options": PropTypes.shape({
				"nests": function(props, propName, componentName) {
					for (let optionProp in props["ui:options"]) {
						const prop = props["ui:options"][optionProp];
						if (!prop.fields || !Array.isArray(prop.fields)) {
							return new Error("Required prop '" + propName + "." + optionProp + ".fields' was not specified in '" + componentName + "'");
						}
					}
				},
				uiSchema: PropTypes.object
			})
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const options = getUiOptions(props.uiSchema);

		let errorSchema = props.errorSchema;
		let formData = props.formData;
		let schemaProperties = props.schema.properties;
		let uiSchema = options.uiSchema ?
			options.uiSchema :
			update(props.uiSchema, {$merge: {"ui:field": undefined, classNames: undefined}});

		let requiredDictionarified = {};
		if (props.schema.required) props.schema.required.forEach((req) => {
			requiredDictionarified[req] = true;
		});

		const idSchema = {};
		Object.keys(props.idSchema).forEach(id => {
			idSchema[id] = props.idSchema[id];
		});

		const {nests} = options;
		Object.keys(nests).forEach((wrapperFieldName) => {
			schemaProperties = update(schemaProperties,
				{$merge: {[wrapperFieldName]: getNewSchemaField(nests[wrapperFieldName].title)}}
			);
			errorSchema = update(errorSchema, {$merge: {[wrapperFieldName]: {}}});

			nests[wrapperFieldName].fields.forEach((fieldName) => {
				schemaProperties[wrapperFieldName].properties[fieldName] = schemaProperties[fieldName];
				if (requiredDictionarified[fieldName]) {
					schemaProperties[wrapperFieldName].required ?
						schemaProperties[wrapperFieldName].required.push(fieldName) :
						(schemaProperties[wrapperFieldName].required = [fieldName])
				}
				errorSchema[wrapperFieldName][fieldName] = errorSchema[fieldName];

				[schemaProperties, errorSchema].forEach(schemaFieldProperty => {
					delete schemaFieldProperty[fieldName];
				});

				if (nests[wrapperFieldName].uiSchema) {
					uiSchema[wrapperFieldName] = nests[wrapperFieldName].uiSchema;
				}

				if (formData && formData.hasOwnProperty(fieldName)) {
						if (!formData[wrapperFieldName]) {
							formData = update(formData, {$merge: {[wrapperFieldName]: {[fieldName]: formData[fieldName]}}});
						} else {
							formData = update(formData,
								{[wrapperFieldName]: {$merge: {[fieldName]: formData[fieldName]}}, [fieldName]: {$set: undefined}}
							);
						}
				}

				delete idSchema[fieldName]
			});

			idSchema[wrapperFieldName] = toIdSchema(
				schemaProperties[wrapperFieldName],
				idSchema.$id + "_" + wrapperFieldName,
				this.props.registry.definitions
			);
		});

		let schema = update(this.props.schema, {properties: {$set: schemaProperties}});
		return {schema, uiSchema, idSchema, errorSchema, formData, onChange: this.onChange};

		function getNewSchemaField(title) {
			return {type: "object", properties: {}, title};
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onChange = (formData) => {
		const {nests} = getUiOptions(this.props.uiSchema);

		let dictionarifiedNests = {};
		Object.keys(nests).forEach((newFieldName) => {
			dictionarifiedNests[newFieldName] = true;
		});
		Object.keys(formData).forEach((prop) => {
			if (dictionarifiedNests[prop]) {
				Object.keys(formData[prop]).forEach((nestedProp) => {
					if (formData && formData[prop] && formData[prop].hasOwnProperty(nestedProp)) {
						formData[nestedProp] = formData[prop][nestedProp];
						formData = update(formData, {$merge: {[nestedProp]: formData[prop][nestedProp]}});
					}
				});
				formData = update(formData, {$merge: {[prop]: undefined}})
			}
		});
		this.props.onChange(formData);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
