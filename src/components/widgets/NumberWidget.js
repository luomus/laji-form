import React, { Component } from "react";
import PropTypes from "prop-types";
import BaseInput from "./BaseInput";

export default class NumberWidget extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		value: PropTypes.string
	}

	render() {
		return <BaseInput {...this.props} formatValue={this.formatValue} />;
	}

	formatValue = (value) => !isNaN(value) ? value : null;
}
