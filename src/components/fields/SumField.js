import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class CopyValuesArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				resultField: PropTypes.string.isRequired,
				summedFields: PropTypes.arrayOf(PropTypes.string).isRequired
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	};

	onChange(formData) {
		const summedFields = this.getUiOptions().summedFields;
		const resultField = this.getUiOptions().resultField;

		let result = 0;
		let allEmpty = true;
		summedFields.forEach(field => {
		    if (formData[field] !== undefined) {
			    result += Number(formData[field]);
			    allEmpty = false;
		    }
		});

		formData[resultField] = allEmpty ? undefined : result;
		this.props.onChange(formData);
	}
}
