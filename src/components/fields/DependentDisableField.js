import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, getInnerUiSchema, isNullOrUndefined } from "../../utils";

/**
 * Disables object field's value according a regexp rule that is matched against another field's value.
 * uiSchema = { "ui:options": {
 *  disableField: <object field name>, (field to disable if disableDefiner's value doesn't match the regexp)
 *  disableDefiner: <object field name>, (field that the regexp is matched against)
 *  uiSchema: <uiSchema> (uiSchema used for each object).
 * }}
 */
export default class DependentDisableField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: PropTypes.arrayOf(PropTypes.shape({
					disableField: PropTypes.string.isRequired,
					disableDefiner: PropTypes.string.isRequired,
					regexp: PropTypes.string.isRequired,
				})).isRequired,
				uiSchema: PropTypes.object
			})
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema, formData} = props;
		let newFormData = formData;

		const {rules} = getUiOptions(props.uiSchema);
		rules.forEach(rule => {
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
				if (rule.hasOwnProperty("disabledValueToDisplay")) {
					newFormData = {...formData, [disableField]: rule.disabledValueToDisplay};
				}
			}
		});

		uiSchema = {...uiSchema, "ui:field": undefined, ...getInnerUiSchema(uiSchema)};

		return {uiSchema, formData: newFormData};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
