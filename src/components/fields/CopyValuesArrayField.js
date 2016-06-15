import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"

export default class AutoArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {onChange: this.onChange, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		let {uiSchema} = props;
		uiSchema = uiSchema["ui:options"].uiSchema;
		return {uiSchema};
	}

	onChange = (formData) => {
		let copyFields = this.props.uiSchema["ui:options"].copy;
		if (formData && this.props.formData && formData.length > this.props.formData.length && formData.length > 1) {
			let prev = formData[formData.length - 2];
			let head = formData[formData.length - 1];
			copyFields.forEach(copyField => {
				head[copyField] = prev[copyField];
			});
			formData = update(formData, {$merge: {[formData.length - 1]: head}});
		}
		this.props.onChange(formData)
	}

	render() {
		return <SchemaField {...this.props} {...this.state} />
	}
}
