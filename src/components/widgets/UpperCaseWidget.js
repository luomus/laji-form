import React, { Component } from "react";
import PropTypes from "prop-types";
import BaseInput from "./BaseInput";

export default class UpperCaseWidget extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.string
		}).isRequired,
		value: PropTypes.string
	}

	render() {
		return <BaseInput {...this.props} formatValue={this.formatValue} />;
	}

	formatValue = (value) => typeof value === "string" ? value.toUpperCase() : value;
}
