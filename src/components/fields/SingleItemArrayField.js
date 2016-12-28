import React, { Component, PropTypes } from "react";
import { getInnerUiSchema } from "../../utils";

export default class SingleItemArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {...this.getStateFromProps(props), onChange: this.onChange};
	}
	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		return {
			schema: props.schema.items,
			uiSchema: getInnerUiSchema(props.uiSchema),
			formData: props.formData ? props.formData[0] : undefined
		};
	}

	onChange = (formData) => {
		this.props.onChange([formData]);
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} {...this.state} />
	}
}
