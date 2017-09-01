import { Component } from "react";
import PropTypes from "prop-types";
import { toIdSchema } from  "react-jsonschema-form/lib/utils";
import { immutableDelete } from  "../../utils";
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

		let {schema, uiSchema, idSchema, errorSchema, formData} = props;

		const {nests} = options;

		const nestedPropsMap = {};

		const nestNames = Object.keys(nests).reduce((names, name) => {
			names[name] = true;
			return names;
		}, {});

		Object.keys(nests).forEach((wrapperFieldName) => {
			const nest = nests[wrapperFieldName];
			const nestedProps = getPropsForFields({schema, uiSchema, idSchema, errorSchema, formData, registry: props.registry}, nests[wrapperFieldName].fields, nest.title);
			nestedPropsMap[wrapperFieldName] = nestedProps;

			schema = {...schema, required: nestedProps.schema.required, properties: {...schema.properties, [wrapperFieldName]: nestedProps.schema}};

			let nestedIdSchema = nestedProps.idSchema;
			nest.fields.forEach(field => {
				if (nestNames[field]) {
					nestedIdSchema[field] = nestedPropsMap[field].idSchema;
				}
			});
			idSchema = {...idSchema, [wrapperFieldName]: nestedIdSchema};

			errorSchema = {...errorSchema, [wrapperFieldName]: nestedProps.errorSchema};

			formData = {...formData, [wrapperFieldName]: nestedProps.formData};

			uiSchema = {
				...uiSchema, [wrapperFieldName]: {
					...(nests[wrapperFieldName] ? nests[wrapperFieldName].uiSchemaRoot : {} || {}), 
					...(uiSchema[wrapperFieldName] || {}), ...nestedProps.uiSchema}
			};
			if (nest.rootUiSchema) {
				uiSchema = {...uiSchema, [wrapperFieldName]: {...(nest.rootUiSchema || {}), ...(uiSchema[wrapperFieldName] || {})}};
			}

			nests[wrapperFieldName].fields.forEach(fieldName => {
				[schema.properties, errorSchema, idSchema, formData, uiSchema].forEach(container => {
					delete container[fieldName];
				});
				if (schema.required) schema.required = schema.required.filter(requiredField => requiredField !== fieldName);
			});
		});

		return {schema, uiSchema, idSchema, errorSchema, formData};
	}

	onChange(formData) {
		const {nests} = this.getUiOptions();

		let dictionarifiedNests = {};
		Object.keys(nests).forEach((newFieldName) => {
			dictionarifiedNests[newFieldName] = true;
		});

		let nestedPropsFound = false;
		do {
			nestedPropsFound = false;
			Object.keys(formData).forEach((prop) => {
				if (dictionarifiedNests[prop]) {
					Object.keys(formData[prop] || {}).forEach((nestedProp) => {
						if (formData && formData[prop] && formData[prop].hasOwnProperty(nestedProp)) {
							formData = {...formData, [nestedProp]: formData[prop][nestedProp]};
						}
					});
					formData = immutableDelete(formData, prop);
					nestedPropsFound = true;
				}
			});
		} while (nestedPropsFound);

		this.props.onChange(formData);
	}
}

export function getPropsForFields({schema, uiSchema, idSchema, errorSchema, formData, onChange, registry: {definitions}}, fields, title) {
	const newSchema = {type: "object", properties: {}, title};
	const newErrorSchema = {};
	const newFormData = {};
	const newUiSchema = ["classNames"].reduce((_uiSchema, prop) => {
		if (prop in _uiSchema) _uiSchema[prop] = uiSchema[prop];
		return _uiSchema;
	}, {});

	const fieldsDictionarified = {};

	fields.forEach((fieldName) => {
		[[schema.properties, newSchema.properties],
			[uiSchema, newUiSchema],
		 [errorSchema, newErrorSchema],
		 [formData, newFormData]
		].forEach(([originalPropContainer, newPropContainer]) => {
			if (originalPropContainer && (originalPropContainer[fieldName] || originalPropContainer[fieldName] === 0)) newPropContainer[fieldName] = originalPropContainer[fieldName];
		});
		fieldsDictionarified[fieldName] = true;
	});

	if (uiSchema["ui:order"]) newUiSchema["ui:order"] = uiSchema["ui:order"].filter(ord => fieldsDictionarified[ord] || ord === "*");
	if (schema.required) newSchema.required = schema.required.filter(req => fieldsDictionarified[req]);

	const newIdSchema = toIdSchema(
		newSchema,
		idSchema.$id,
		definitions
	);

	const newOnChange = formData => {
		let newFormData = fields.reduce((_formData, field) => {
			_formData = {..._formData, [field]: formData[field]};
			return _formData;
		}, formData);
		return onChange(newFormData);
	};

	return {
		schema: newSchema, 
		uiSchema: newUiSchema, 
		idSchema: newIdSchema,
		errorSchema: newErrorSchema,
		formData: newFormData,
		onChange: onChange? newOnChange : undefined
	};
}
