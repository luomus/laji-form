import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";

window.PropTypes = PropTypes;

const conditionPropType = {
	regexp: PropTypes.string,
	length: PropTypes.number,
	reverse: PropTypes.bool,
};

const rulePropType = PropTypes.shape({
	transformations: PropTypes.object.isRequired,
	conditions: (props, propName, componentName) => 
		Object.keys(props[propName]).every(prop => PropTypes.checkPropTypes(conditionPropType, props[propName][prop], propName, componentName))
}).isRequired;

/**
 * Changes formData on onChange event according to conditional rules.
 * uiSchema = {
 *   "ui:options": {
 *     rules: { // Can also be an array of rules
 *       transformations: {
 *        <field name to change if conditions met>: <new value>
 *       },
 *       conditions: {
 *         <conditional field name>: { // Note that regexp and length must both pass for this rule to pass.
 *           regexp: <string> <if the conditional field value matches this regexp, this condition will pass>
 *           length: <number> <if the conditional field value length is equal or more, this conndition will pass>
 *           reverse: <boolean> <Reverses the passing value>
 *         }
 *       }
 *     }
 *   }
 * }
 */
@VirtualSchemaField
export default class ConditionalOnChangeField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: PropTypes.oneOfType([
					rulePropType,
					PropTypes.arrayOf(rulePropType)
				]).isRequired
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	static getName() {return "ConditionalOnChangeField";}

	onChange(formData) {
		const {rules} = this.getUiOptions();

		(Array.isArray(rules) ? rules : [rules]).forEach(({conditions, transformations}) => {
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
