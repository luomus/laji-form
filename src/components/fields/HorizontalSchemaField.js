import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import HorizontalWrapper from "../HorizontalWrapper";

export default class HorizontalSchemaField extends Component {
	render() {
		let uiSchema = JSON.parse(JSON.stringify(this.props.uiSchema));
		delete uiSchema["ui:field"];
		return (
			<HorizontalWrapper><SchemaField {...this.props} uiSchema={uiSchema} /></HorizontalWrapper>
		);
	}
}
