import React, { Component, PropTypes } from "react";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class SingleItemArrayField extends Component {
	getStateFromProps(props) {
		return {
			schema: props.schema.items,
			formData: props.formData ? props.formData[0] : undefined
		};
	}

	onChange(formData) {
		this.props.onChange([formData]);
	}
}
