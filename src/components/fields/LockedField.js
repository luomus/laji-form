import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

export default class LockedField extends Component {
	render() {
		return (<input type="text" className="form-control" value={this.props.formData} disabled/>);
	}
}
