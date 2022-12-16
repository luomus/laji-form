import * as React from "react";
import * as PropTypes from "prop-types";
import { immutableDelete, updateFormDataWithJSONPointer, updateSafelyWithJSONPointer, uiSchemaJSONPointer, parseJSONPointer, schemaJSONPointer, toJSONPointer, getUiOptions } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

const injectionPropType = PropTypes.shape({
	fields: PropTypes.arrayOf(PropTypes.string).isRequired,
	target: PropTypes.string.isRequired
});


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
export default class InjectField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				injections: PropTypes.oneOfType([PropTypes.arrayOf(injectionPropType), injectionPropType]).isRequired,
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return "InjectField";}

	getStateFromProps(props) {
		const options = getUiOptions(props.uiSchema);
		const {injections} = options;
		let {schema, uiSchema, idSchema, formData, errorSchema} = props;

		(Array.isArray(injections) ? injections : [injections]).forEach((injection) => {
			let {fields, target} = injection;

			target = toJSONPointer(target);

			const origSchema = schema;
			fields.forEach((fieldPath) => {
				fieldPath = toJSONPointer(fieldPath);
				const fieldName = fieldPath.split("/").pop();

				schema = updateSafelyWithJSONPointer(
					schema,
					parseJSONPointer(origSchema, schemaJSONPointer(origSchema, fieldPath)),
					`${schemaJSONPointer(origSchema, target)}/properties/${fieldName}`
				);
				schema = immutableDelete(schema, schemaJSONPointer(origSchema, fieldPath));

				uiSchema = updateSafelyWithJSONPointer(
					uiSchema,
					parseJSONPointer(uiSchema, uiSchemaJSONPointer(origSchema, fieldPath)),
					`${uiSchemaJSONPointer(origSchema, target)}/${fieldName}`
				);
				uiSchema = immutableDelete(uiSchema, uiSchemaJSONPointer(origSchema, fieldPath));

				const [_formData, _idSchema, _errorSchema] = [formData, idSchema, errorSchema].map(prop => 
					immutableDelete(updateSafelyWithJSONPointer(
						prop,
						parseJSONPointer(prop, fieldPath),
						`${target}/${fieldName}`
					), fieldPath)
				);
				formData = _formData;
				errorSchema = _errorSchema;
				idSchema = _idSchema;
			});
		});

		return {schema, uiSchema, idSchema, formData, errorSchema, onChange: this.onChange};
	}

	onChange = (formData) => {
		const options = this.getUiOptions();

		(Array.isArray(options.injections) ? options.injections.slice(0).reverse() : [options.injections]).forEach((injection) => {
			let {fields, target} = injection;
			target = toJSONPointer(target);

			formData = fields.reduce((formData, fieldPointer) => {
				fieldPointer = toJSONPointer(fieldPointer);
				const fieldName = fieldPointer.split("/").pop();
				formData = updateFormDataWithJSONPointer({...this.props, formData}, parseJSONPointer(formData, `${target}/${fieldName}`), fieldPointer);
				formData = immutableDelete(formData, `${target}/${fieldName}`);
				return formData;
			}, formData);
		});

		this.props.onChange(formData);
	}
}
