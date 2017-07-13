import { Component } from "react";
import PropTypes from "prop-types";
import { immutableDelete } from  "../../utils";
import { toIdSchema } from  "react-jsonschema-form/lib/utils";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Makes it possible to combine two string typed fields from object schema without touching the form data structure.
 *
 * Example usage:
 *
 * schema = {
 *  "type": "object",
 *  "properties": {
 *    "inner_1" { "type": "string" },
 *    "inner_2": { "type": "string" },
 *    "inner_3": { "type": "string" }
 *  }
 *
 *  uiSchema = {
 *    "ui:field": "CombinedStringField",
 *    "ui:options": {
 *      "combined": [
 *        "fields": [
 *          "inner_1",
 *          "inner_2"
 *        ],
 *        "name": "inner_12",
 *      ],
 *    "uiSchema: {...}
 *  }
 *
 *  would make the schema look like this:
 *
 *  schema = {
 *    "type": "object",
 *    "properties": {
 *      "inner_1" { "type": "string" },
 *      "inner_2": { "type": "string" },
 *      "inner_3": { "type": "string" },
 *      "inner_12": { "type": "string" }
 *    }
 *  }
 */

@VirtualSchemaField
export default class CombinedStringField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				combined: PropTypes.arrayOf(PropTypes.shape({
					fields: PropTypes.arrayOf(PropTypes.string).isRequired
				})).isRequired,
				name: PropTypes.string,
				title: PropTypes.string,
				delimiter: PropTypes.string
			}),
			uiSchema: PropTypes.object
		}).isRequired
	};

	getStateFromProps(props) {
		const uiOptions = this.getUiOptions();
		let {schema, uiSchema, idSchema, formData} = props;

		uiOptions.combined.forEach(options => {
			const name = options.name || "";
			const title = options.title || "";
			const delimiter = options.delimiter || "";

			const valueArray = options.fields.reduce((valueArray, field) => {
				if (formData[field]) { valueArray.push(formData[field]); }
				return valueArray;
			}, []);

			schema = {...schema, properties: {...schema.properties, [name]: {title, type: "string" }}};
			idSchema = toIdSchema(
                schema,
                idSchema.$id,
                props.registry.definitions
            );
			formData = {...formData, [name]: valueArray.join(delimiter)};
		});
		
		return {schema, uiSchema, idSchema, formData};
	}

	onChange(formData) {
		const uiOptions = this.getUiOptions();
		const combinedFields = uiOptions.combined.map(options => {
			return options.name || "";
		}, []);

		combinedFields.forEach(field => {
			formData = immutableDelete(formData, field);
		});

		this.props.onChange(formData);
	}
}

