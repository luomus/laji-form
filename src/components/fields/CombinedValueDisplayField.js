import * as React from "react";
import * as PropTypes from "prop-types";
import { immutableDelete, parseJSONPointer } from  "../../utils";
import { toIdSchema } from  "@rjsf/utils";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Combines values of two fields into one value which can be used for displaying (editing that value doesn't change formData)
 * Combine types:
 * timeDifference: combines the values by calculating their time difference
 * stringJoin (default): combines the values by joining them. delimiter is added between if given
 */

const combinedPropType = PropTypes.shape({
	firstField: PropTypes.string.isRequired,
	secondField: PropTypes.string.isRequired,
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
			const {name, title, combineType, firstField, secondField} = options;

			schema = {...schema, properties: {...schema.properties, [name || ""]: {title: title || "", type: "string" }}};
			idSchema = toIdSchema(
				schema,
				idSchema.$id,
				props.registry.definitions
			);

			let value = undefined;

			const firstValue = firstField[0] === "/" ? parseJSONPointer(formData, firstField, !!"safely") : formData[firstField];
			const secondValue = secondField[0] === "/" ? parseJSONPointer(formData, secondField, !!"safely") : formData[secondField];
			if (combineType === "timeDifference") {
				if (firstValue && secondValue) {
					const difference = this.toMinutes(secondValue) - this.toMinutes(formData[firstField]);
					if (difference >= 0) {
						const hours = Math.floor(difference / 60);
						const minutes = difference % 60;
						value = hours + " h " + minutes + " min";
					}
				}
			} else {
				const delimiter = options.delimiter || "";
				value = [];
				if (firstValue) value.push(firstValue);
				if (secondValue) value.push(secondValue);
				value = value.join(delimiter);
			}

			formData = {...formData, [name]: value};
		});
		
		return {schema, idSchema, formData};
	}

	toMinutes = (time) => {
		const parts = time.split(":");
		return Number(parts[0]) * 60 + Number(parts[1]);
	};

	onChange(formData) {
		const uiOptions = this.getUiOptions();
		const combined = Array.isArray(uiOptions.combined) ? uiOptions.combined : [uiOptions.combined];

		const combinedFields = combined.map(options => {
			return options.name || "";
		}, []);

		combinedFields.forEach(field => {
			formData = immutableDelete(formData, field);
		});

		this.props.onChange(formData);
	}
}

