import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, getInnerUiSchema } from "../../utils";

export default class CopyValuesArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				copy: PropTypes.arrayOf(PropTypes.string).isRequired,
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {onChange: this.onChange, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const uiSchema = getInnerUiSchema(props.uiSchema);
		return {uiSchema};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onChange = (formData) => {
		const copyFields = getUiOptions(this.props.uiSchema).copy;
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
		const SchemaField = this.props.registry.fields.SchemaField;
		return <SchemaField {...this.props} {...this.state} />
	}
}
