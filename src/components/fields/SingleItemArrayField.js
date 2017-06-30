import React, { Component } from "react";
import update from "immutability-helper";
import VirtualSchemaField from "../VirtualSchemaField";
import { getUiOptions } from "../../utils";

@VirtualSchemaField
export default class SingleItemArrayField extends Component {
	getStateFromProps(props) {
		const {activeIdx} = getUiOptions(props.uiSchema);
		return {
			name: undefined,
			schema: {title: props.schema.title, ...props.schema.items},
			uiSchema: props.uiSchema.items,
			formData: props.formData && activeIdx !== undefined ? props.formData[activeIdx] : undefined
		};
	}

	render() {
		const {uiSchema, registry: {fields: {SchemaField}}} = this.props;

		const {activeIdx} = this.getUiOptions(uiSchema);

		return activeIdx === undefined ? null : <SchemaField {...this.props} {...this.state} />;
	}

	onChange(formData) {
		this.props.onChange(update(this.props.formData, {[this.getUiOptions().activeIdx || 0]: {$set: formData}}));
	}
}
