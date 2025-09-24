import * as React from "react";
import * as PropTypes from "prop-types";
import BaseInputTemplate from "../templates/BaseInputTemplate";

export default class NumberWidget extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		value: PropTypes.string
	};

	render() {
		return <BaseInputTemplate {...this.props} formatValue={this.formatValue} />;
	}

	formatValue = (value) => !isNaN(value) ? value : null;
}
