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
		let passes = true;
		for (let field in rules) {
			const rule = rules[field];
			const {regexp, length, transformations} = rule;
			if (formData && formData[field] && formData[field] !== this.props.formData[field]) {
				if (passes && regexp !== undefined) {
					const regexp = new RegExp(rule.regexp.replace("%default", this.props.schema.properties[field].default));
					passes = `${formData[field]}`.match(regexp);
				}
				if (passes && length !== undefined) {
					passes = formData[field].length >= length;
				}

			}
			if (passes) {
				let formDataChange = {};
				if (transformations) for (let transformField in transformations) {
					formDataChange[transformField] = transformations[transformField];
				}
				formData = {...formData, ...formDataChange};
			}
		}
		this.props.onChange(formData);
	}
}
