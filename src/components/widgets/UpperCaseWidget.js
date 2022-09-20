import * as React from "react";
import * as PropTypes from "prop-types";
import BaseInputTemplate from "../templates/BaseInputTemplate";

export default class UpperCaseWidget extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		value: PropTypes.string
	}

	render() {
		return <BaseInputTemplate {...this.props} formatValue={this.formatValue} />;
	}

	formatValue = (value) => typeof value === "string" ? value.toUpperCase() : value;
}
