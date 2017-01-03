import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class CopyValuesArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				copy: PropTypes.arrayOf(PropTypes.string).isRequired
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	onChange(formData) {
		const copyFields = this.getUiOptions().copy;
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
}
