import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class InputTransformerField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: PropTypes.object.isRequired,
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	static getName() {return "InputTransformerField";}

	onChange(formData) {
		const {rules} = this.getUiOptions();
		rules.forEach(({conditions, transformations}) => {
			let passes = true;

			// If transforming field is updated, do nothing
			// (If a transforming field is also a condition field, the field would take the conditional value always when updated).
			if (Object.keys(transformations).some(field => 
				formData && formData[field] && formData[field] !== this.props.formData[field]
			)) {
				return;
			}

			// If condition fields didn't change, do nothing.
			if (Object.keys(conditions).every(field => 
				formData && formData[field] && formData[field] === this.props.formData[field]
			)) {
				return;
			}

			for (let field in conditions) {
				const condition = conditions[field];
				const {regexp, length, reverse} = condition;
				if (passes && regexp !== undefined) {
					const regexp = new RegExp(condition.regexp.replace("%default", this.props.schema.properties[field].default));
					const result = `${formData[field]}`.match(regexp);
					passes = reverse ? !result : result;
				}
				if (passes && length !== undefined) {
					const result = formData[field].length >= length;
					passes = reverse ? !result : result;
				}
				if (!passes) break;
			}
			if (passes) {
				let formDataChange = {};
				if (transformations) for (let transformField in transformations) {
					formDataChange[transformField] = transformations[transformField];
				}
				formData = {...formData, ...formDataChange};
			}
		});
		this.props.onChange(formData);
	}
}
