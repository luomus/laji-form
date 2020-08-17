import * as React from "react";
import * as PropTypes from "prop-types";
import update from "immutability-helper";
import { toIdSchema, getDefaultFormState } from  "@rjsf/core/dist/cjs/utils";
import { immutableDelete, getUiOptions, updateSafelyWithJSONPointer, parseJSONPointer, checkJSONPointer, schemaJSONPointer, uiSchemaJSONPointer } from  "../../utils";
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
export default class NestField extends React.Component {
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
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return "NestField";}

	getStateFromProps(props) {
		const options = this.getUiOptions();

		let {schema, uiSchema, idSchema, errorSchema, formData, registry} = props;

		const {nests, buttonsNest} = options;
		const buttons = getUiOptions(uiSchema).buttons;
		const uiButtons = uiSchema["ui:buttons"];

		const nestedPropsMap = {};

		const nestNames = Object.keys(nests).reduce((names, name) => {
			names[name] = true;
			return names;
		}, {});

		Object.keys(nests).forEach((wrapperFieldName) => {
			const nest = nests[wrapperFieldName];
			const nestedProps = getPropsForFields({schema, uiSchema, idSchema, errorSchema, formData, registry}, nests[wrapperFieldName].fields, nest.title);
			nestedPropsMap[wrapperFieldName] = nestedProps;

			schema = {...schema, properties: {...schema.properties, [wrapperFieldName]: nestedProps.schema}};

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
					...nestedProps.uiSchema,
					...(nests[wrapperFieldName] ? nests[wrapperFieldName].rootUiSchema : {} || {}),
					...(uiSchema[wrapperFieldName] || {})}
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

		if (buttonsNest && nests[buttonsNest]) {
			if (uiButtons) {
				uiSchema = {
					"ui:buttons": undefined,
					[buttonsNest]: {
						...(uiSchema[buttonsNest] || []),
						"ui:buttons": [
							...uiSchema["ui:buttons"]
						]
					}
				};
			}
			if (buttons) {
				let nestOptions = getUiOptions(uiSchema[buttonsNest]);
				let _buttons = nestOptions.buttons || [];
				uiSchema = {
					...uiSchema,
					"ui:options": {
						...uiSchema["ui:options"],
						buttons: undefined
					},
					[buttonsNest]: {
						...uiSchema[buttonsNest],
						"ui:options": {
							...nestOptions,
							buttons: [..._buttons, ...buttons]
						}
					}
				};
			}
		}

		const {"ui:order": order = []} = uiSchema;
		const dictionarifiedOrder = order.reduce((dict, field, idx) => {
			dict[field] = idx;
			return dict;
		}, {});
		const splices = [];
		if (order) {
			Object.keys(nests).forEach(nestName => {
				const {fields} = nests[nestName];
				fields.forEach(field => {
					const idx = dictionarifiedOrder[field];
					if (idx !== undefined) {
						splices.push([idx, 1]);
					}
				});
			});
			if (splices.length) uiSchema = update(uiSchema, {"ui:order": {$splice: splices.sort(([idx], [_idx]) => _idx - idx)}});
		}

		return {schema, uiSchema, idSchema, errorSchema, formData};
	}

	onChange(formData) {
		const {nests} = this.getUiOptions();

		Object.keys(nests).reverse().forEach(nestName => {
			if (formData[nestName]) {
				Object.keys(formData[nestName]).forEach(prop => {
					if (formData[nestName].hasOwnProperty(prop)) formData = {...formData, [prop]: formData[nestName][prop]};
				});
				formData = immutableDelete(formData, nestName);
			}
		});

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

	// For keeping field names compatible with idSchema.
	const flattenPointerName = fieldName => fieldName[0] === "/" ? fieldName.replace(/(?!^)\//g, "_").substr(1) : fieldName;

	fields.forEach(fieldName => {
		[
			[schema.properties, newSchema.properties, schemaJSONPointer(schema.properties, fieldName)],
			[uiSchema, newUiSchema, uiSchemaJSONPointer(schema.properties, fieldName)],
			[errorSchema, newErrorSchema, fieldName],
			[formData, newFormData, fieldName]
		].forEach(([originalPropContainer, newPropContainer, _fieldName]) => {
			if (_fieldName !== undefined && checkJSONPointer(originalPropContainer, _fieldName)) {
				newPropContainer[flattenPointerName(fieldName)] = parseJSONPointer(originalPropContainer, _fieldName);
			}
		});
		fieldsDictionarified[fieldName] = true;
	});

	// TODO Doesn't work for JSON Pointer fields.
	if (uiSchema["ui:order"]) newUiSchema["ui:order"] = uiSchema["ui:order"].filter(ord => fieldsDictionarified[ord] || ord === "*");
	if (schema.required) newSchema.required = schema.required.filter(req => fieldsDictionarified[req]);

	const newIdSchema = toIdSchema(
		newSchema,
		idSchema.$id,
		definitions
	);

	const newOnChange = formData => {
		let newFormData = fields.reduce((_formData, field) => {
			_formData = updateSafelyWithJSONPointer(_formData, _formData[flattenPointerName[field]], field, !!"immutably", (__formData, path) => {
				const _schema = parseJSONPointer(schema, schemaJSONPointer(schema, path));
				return getDefaultFormState(_schema, undefined, definitions);
			});
			_formData = immutableDelete(_formData, flattenPointerName(field));
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
		onChange: onChange ? newOnChange : undefined
	};
}
