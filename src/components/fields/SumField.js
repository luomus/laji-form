import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class SumField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				resultField: PropTypes.string.isRequired,
				summedFields: PropTypes.arrayOf(PropTypes.string).isRequired
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	};

	static getName() {return "SumField";}

	onChange(formData) {
		const summedFields = this.getUiOptions().summedFields;
		const resultField = this.getUiOptions().resultField;
		const resultType = this.props.schema.properties[resultField].type;

		let result = 0;
		let allEmpty = true;
		summedFields.forEach(field => {
		    if (formData[field] !== undefined) {
			    result += Number(formData[field]);
			    allEmpty = false;
		    }
		});

		result = allEmpty || isNaN(result) ? undefined : result;
		if (result !== undefined && resultType !== "number" && resultType !== "integer") {
			result = result + "";
		}

		formData[resultField] = result;
		this.props.onChange(formData);
	}
}
