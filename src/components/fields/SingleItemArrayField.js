import React, { Component, PropTypes } from "react";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class SingleItemArrayField extends Component {
	getStateFromProps(props) {
		return {
			schema: {title: props.schema.title, ...props.schema.items},
			uiSchema: props.uiSchema.items,
			formData: props.formData ? props.formData[0] : undefined
		};
	}

	onChange(formData) {
		this.props.onChange([formData]);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<SchemaField
				{...this.props}
				{...this.state}
				onChange={this.onChange}
			/>
		);
	}
}
