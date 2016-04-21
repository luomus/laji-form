import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import HorizontalWrapper from "../HorizontalWrapper";

export default class HorizontalSchemaField extends Component {
	constructor(props) {
		super(props);

		let uiSchema = JSON.parse(JSON.stringify(props.uiSchema));
		delete uiSchema["ui:field"];

		this.state = {uiSchema};
	}

	render() {
		return (
			<HorizontalWrapper><SchemaField {...this.props} uiSchema={this.state.uiSchema} /></HorizontalWrapper>
		);
	}
}
