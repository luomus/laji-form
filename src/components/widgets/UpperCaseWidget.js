import React, { Component } from "react";
import BaseInput from "./BaseInput";

export default class UpperCaseWidget extends Component {
	render() {
		return <BaseInput {...this.props} formatValue={this.formatValue} />
	}

	formatValue = (value) => typeof value === "string" ? value.toUpperCase() : value;
}
