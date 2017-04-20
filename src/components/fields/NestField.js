import { Component } from "react";
import PropTypes from "prop-types";
import { toIdSchema } from  "react-jsonschema-form/lib/utils";
import VirtualSchemaField from "../VirtualSchemaField";

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
@VirtualSchemaField
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
				}
			}),
			uiSchema: PropTypes.object
		}).isRequired
	}

	getStateFromProps(props) {
		const options = this.getUiOptions();

		let {errorSchema, formData} = props;
		let schemaProperties = props.schema.properties;

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
			schemaProperties = {...schemaProperties, [wrapperFieldName]: getNewSchemaField(nests[wrapperFieldName].title)};
			errorSchema = {...errorSchema, [wrapperFieldName]: {}};

			nests[wrapperFieldName].fields.forEach((fieldName) => {
				schemaProperties[wrapperFieldName].properties[fieldName] = schemaProperties[fieldName];
				if (requiredDictionarified[fieldName]) {
					schemaProperties[wrapperFieldName].required ?
						schemaProperties[wrapperFieldName].required.push(fieldName) :
						(schemaProperties[wrapperFieldName].required = [fieldName]);
				}
				errorSchema[wrapperFieldName][fieldName] = errorSchema[fieldName];

				[schemaProperties, errorSchema].forEach(schemaFieldProperty => {
					delete schemaFieldProperty[fieldName];
				});

				if (formData && formData.hasOwnProperty(fieldName)) {
					if (!formData[wrapperFieldName]) {
						formData = {...formData, [wrapperFieldName]: {[fieldName]: formData[fieldName]}};
					} else {
						formData = {...formData,
							[wrapperFieldName]: {...formData[wrapperFieldName], [fieldName]: formData[fieldName]},
							[fieldName]: undefined
						};
					}
				}

				delete idSchema[fieldName];
			});

			idSchema[wrapperFieldName] = toIdSchema(
				schemaProperties[wrapperFieldName],
				idSchema.$id + "_" + wrapperFieldName,
				this.props.registry.definitions
			);
		});

		let schema = {...this.props.schema, properties:  schemaProperties};
		return {schema, idSchema, errorSchema, formData};

		function getNewSchemaField(title) {
			return {type: "object", properties: {}, title};
		}
	}

	onChange(formData) {
		const {nests} = this.getUiOptions();

		let dictionarifiedNests = {};
		Object.keys(nests).forEach((newFieldName) => {
			dictionarifiedNests[newFieldName] = true;
		});
		Object.keys(formData).forEach((prop) => {
			if (dictionarifiedNests[prop]) {
				Object.keys(formData[prop]).forEach((nestedProp) => {
					if (formData && formData[prop] && formData[prop].hasOwnProperty(nestedProp)) {
						formData[nestedProp] = formData[prop][nestedProp];
						formData = {...formData, [nestedProp]: formData[prop][nestedProp]};
					}
				});
				formData = {...formData, [prop]: undefined};
			}
		});
		this.props.onChange(formData);
	}
}
