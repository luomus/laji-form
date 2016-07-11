import React, { Component, PropTypes } from "react";
import update from "react-addons-update";

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
		uiSchema = (uiSchema && uiSchema["ui:options"] && uiSchema["ui:options"].uiSchema) ?
			uiSchema["ui:options"].uiSchema : {};
		Object.keys(props.uiSchema).forEach(key => {
			if (key !== "ui:options") {
				uiSchema = update(uiSchema, {$merge: {[key]: props.uiSchema[key]}})
			}
		});

		let options = props.uiSchema["ui:options"];

		if (!options) {
			return {uiSchema: update(uiSchema, {$merge: {"ui:field": undefined}})};
		}

		let disableField = options.disableField;
		let definer = options.disableDefiner;
		let regexp = new RegExp(options.regexp);

		if (!props.formData || props.formData[definer] === undefined || props.formData[definer] === null ||
			(props.formData && props.formData[definer] !== undefined && props.formData[definer] !== null && !props.formData[definer].match(regexp))) {
			if (!uiSchema[disableField]) uiSchema = update(uiSchema, {$merge: {[disableField]: {}}});
			uiSchema = update(uiSchema, {[disableField]: {$merge: {"ui:disabled": true}}});
		}

		return {uiSchema};
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
