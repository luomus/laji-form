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
				disableField: PropTypes.string.isRequired,
				disableDefiner: PropTypes.string.isRequired,
				regexp: PropTypes.string.isRequired,
				uiSchema: PropTypes.object
			}).isRequired
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
		let {uiSchema} = props;
		uiSchema = getInnerUiSchema(uiSchema);
		Object.keys(props.uiSchema).forEach(key => {
			if (key !== "ui:options") {
				uiSchema = update(uiSchema, {$merge: {[key]: props.uiSchema[key]}})
			}
		});

		const options = getUiOptions(props.uiSchema);

		if (!options) {
			return {uiSchema: update(uiSchema, {$merge: {"ui:field": undefined}})};
		}
;
		const {disableField, disableDefiner, regexp} = options;
		const {formData} = props;

		if (!formData || formData[disableDefiner] === undefined || formData[disableDefiner] === null ||
			(formData && !isNullOrUndefined(formData[disableDefiner]) && !formData[disableDefiner].match(regexp))) {
			if (!uiSchema[disableField]) uiSchema = {...uiSchema, [disableField]: {}};
			uiSchema = update(uiSchema, {[disableField]: {$merge: {"ui:disabled": true}}});
		}

		return {uiSchema};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
