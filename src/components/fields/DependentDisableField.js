import * as React from "react";
import * as PropTypes from "prop-types";
import update from "immutability-helper";
import { isNullOrUndefined } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Disables object field's value according a regexp rule that is matched against another field's value.
 * uiSchema = { "ui:options": {
 *  disableField: <object field name>, (field to disable if disableDefiner's value doesn't match the regexp)
 *  disableDefiner: <object field name>, (field that the regexp is matched against)
 *  uiSchema: <uiSchema> (uiSchema used for each object).
 * }}
 */
@VirtualSchemaField
export default class DependentDisableField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: PropTypes.arrayOf(PropTypes.shape({
					disableField: PropTypes.string.isRequired,
					disableDefiner: PropTypes.string.isRequired,
					regexp: PropTypes.string.isRequired,
				})).isRequired
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return "DependentDisableField";}

	getStateFromProps(props) {
		let {uiSchema, formData} = props;
		let newFormData = formData;

		this.getUiOptions().rules.forEach(rule => {
			const {disableField, disableDefiner, regexp} = rule;
			const {formData} = props;

			const fieldToMatch = (formData && !isNullOrUndefined(formData[disableDefiner])) ?
				formData[disableDefiner] : "";

			if (fieldToMatch.match(regexp)) {
				if (!uiSchema[disableField]) {
					uiSchema = {...uiSchema, [disableField]: {}};
				}
				uiSchema = update(uiSchema, {
					[disableField]: {
						$merge: {
							"ui:disabled": true,
							"ui:inlineHelp": rule.inlineHelp
						}
					}
				});
				if ("disabledValueToDisplay" in rule) {
					newFormData = {...formData, [disableField]: rule.disabledValueToDisplay};
				}
			}
		});

		return {uiSchema, formData: newFormData};
	}
}
