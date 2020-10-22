import React from "react";
import PropTypes from "prop-types";

const URLWidget = (props) => <a href={props.options.template ? props.options.template + props.value : props.value} target="_blank" rel="noopener noreferrer">{props.options.template ? props.options.template + props.value : props.value}</a>;
URLWidget.propTypes = {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}),
	value: PropTypes.string
};
export default URLWidget;
