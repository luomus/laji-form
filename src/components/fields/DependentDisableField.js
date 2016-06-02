import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Disables object fields value according a regexp rule.
 * uiSchema = { "ui:options": {
 *  disableField: <object field name>,
 *  disableDefiner: <object field name>,
 *  uiSchema: <uiSchema> (uiSchema used for each object).
 * }}
 */
export default class DependentDisableField extends Component {
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
		})
		
		let options = props.uiSchema["ui:options"];
		let disableField = options.disableField;
		let definer = options.disableDefiner;
		let regexp = new RegExp(options.regexp);
		
		if (!props.formData || props.formData[definer] === undefined ||
			(props.formData && props.formData[definer] !== undefined && !props.formData[definer].match(regexp))) {
			if (!uiSchema[disableField]) uiSchema = update(uiSchema, {$merge: {[disableField]: {}}});
			uiSchema = update(uiSchema, {[disableField]: {$merge: {"ui:disabled": true}}});
		}
		
		return {uiSchema};
	}

	render() {
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
