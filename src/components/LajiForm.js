import React, { Component } from "react";
import Form from "react-jsonschema-form";
import UnitsField from "./fields/UnitsField";

const log = (type) => console.log.bind(console, type);

export default class LajiForm extends Component {
	render() {
		return (
			<Form
				{...this.props}
				fields={{unitTripreport: UnitsField}}
				onError={log("errors")} />
		)
	}
}
