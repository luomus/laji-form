import * as React from "react";
import * as PropTypes from "prop-types";

const URLWidget = ({value}) => <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
URLWidget.propTypes = {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}),
	value: PropTypes.string
};
export default URLWidget;
