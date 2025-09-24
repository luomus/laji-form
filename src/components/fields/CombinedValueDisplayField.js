import * as React from "react";
import * as PropTypes from "prop-types";
import { immutableDelete, parseJSONPointer } from  "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Combines values of two (or more) fields into one value which can be used for displaying (editing that value doesn't change formData)
 * Combine types:
 * timeDifference: combines the values by calculating their time difference
 * totalCount: combines the values by summing their counts together. if the value is an array the count is its length and if it is a number the count is the value
 * stringJoin (default): combines the values by joining them. delimiter is added between if given
 */

const combinedPropType = PropTypes.shape({
	firstField: PropTypes.string.isRequired,
	secondField: PropTypes.string.isRequired,
	additionalFields: PropTypes.arrayOf(PropTypes.string),
	name: PropTypes.string,
	title: PropTypes.string,
	combineType: PropTypes.string,
	delimiter: PropTypes.string
});

@VirtualSchemaField
export default class CombinedValueDisplayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				combined: PropTypes.oneOfType([
					combinedPropType,
					PropTypes.arrayOf(combinedPropType)
				])
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	};

	static getName() {return  "CombinedValueDisplayField";}

	getStateFromProps(props) {
		const uiOptions = this.getUiOptions();
		let {schema, idSchema, formData} = props;

		const combined = Array.isArray(uiOptions.combined) ? uiOptions.combined : [uiOptions.combined];

		combined.forEach(options => {
			const {name, title, combineType, firstField, secondField, additionalFields = []} = options;

			schema = {...schema, properties: {...schema.properties, [name || ""]: {title: title || "", type: "string" }}};

			idSchema = this.props.registry.schemaUtils.toIdSchema(
				schema,
				idSchema.$id
			);

			let value = undefined;

			const firstValue = this.getFieldValue(formData, firstField);
			const secondValue = this.getFieldValue(formData, secondField);
			const additionalValues = additionalFields.map(field => this.getFieldValue(formData, field));
			const allValues = [firstValue, secondValue].concat(additionalValues);

			if (combineType === "timeDifference") {
				if (firstValue && secondValue) {
					const difference = this.toMinutes(secondValue) - this.toMinutes(formData[firstField]);
					if (difference >= 0) {
						const hours = Math.floor(difference / 60);
						const minutes = difference % 60;
						value = hours + " h " + minutes + " min";
					}
				}
			} else if (combineType === "totalCount") {
				value = allValues.reduce((result, current) => result + this.getCount(current), 0);
			} else {
				const delimiter = options.delimiter || "";
				value = allValues.reduce((result, current) => {
					if (current) {
						result.push(current);
					}
					return result;
				}, []);
				value = value.join(delimiter);
			}

			formData = {...formData, [name]: value};
		});
		
		return {schema, idSchema, formData, onChange: this.onChange};
	}

	getFieldValue = (formData, field) => {
		return field[0] === "/" ? parseJSONPointer(formData, field, !!"safely") : formData[field];
	};

	toMinutes = (time) => {
		const parts = time.split(":");
		return Number(parts[0]) * 60 + Number(parts[1]);
	};

	getCount = (value) => {
		return Array.isArray(value) ? value.length : (typeof value === "number" ? value : 0);
	};

	onChange = (formData) => {
		const uiOptions = this.getUiOptions();
		const combined = Array.isArray(uiOptions.combined) ? uiOptions.combined : [uiOptions.combined];

		const combinedFields = combined.map(options => {
			return options.name || "";
		}, []);

		combinedFields.forEach(field => {
			formData = immutableDelete(formData, field);
		});

		this.props.onChange(formData);
	};
}

