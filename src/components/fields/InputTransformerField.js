import React, { Component, PropTypes } from "react";
import update from "react-addons-update";

export default class InputTransformerField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: PropTypes.object.isRequired,
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

	getStateFromProps(props) {
		let uiSchema = (props.uiSchema && props.uiSchema["ui:options"] && props.uiSchema["ui:options"].uiSchema) ?
			props.uiSchema["ui:options"].uiSchema : {};
		return {uiSchema};
	}

	onChange = (formData) => {
		const rules = this.props.uiSchema["ui:options"].rules;
		for (let field in rules) {
			const rule = rules[field];
			const regexp = new RegExp(rule.regexp);
			if (formData && formData[field] && formData[field].match(regexp))  {
				let formDataChange = {};
				formDataChange[field] = formData[field].replace(regexp, "\$1");
				if (rule.transformations) for (let transformField in rule.transformations) {
					formDataChange[transformField] = rule.transformations[transformField];
				}
				formData = update(formData, {$merge: formDataChange});
			}
		}
		this.props.onChange(formData);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<SchemaField
				{...this.props}
				{...this.state}
			/>
		)
	}
}
