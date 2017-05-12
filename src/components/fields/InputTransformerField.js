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

	onChange(formData) {
		const {rules} = this.getUiOptions();
		for (let field in rules) {
			const rule = rules[field];
			const regexp = new RegExp(rule.regexp.replace("%default", this.props.schema.properties[field].default));
			if (formData && formData[field] && `${formData[field]}`.match(regexp))  {
				let formDataChange = {};
				if (rule.transformations) for (let transformField in rule.transformations) {
					formDataChange[transformField] = rule.transformations[transformField];
				}
				formData = {...formData, ...formDataChange};
			}
		}
		this.props.onChange(formData);
	}
}
