import React from "react";
import PropTypes from "prop-types";

const URLWidget = ({value, options = {}}) => 
        <a href={`${options.template || ""}${value}`} target="_blank" rel="noopener noreferrer">
			{`${options.template || ""}${value}`}
		</a>;

URLWidget.propTypes = {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}),
	value: PropTypes.string
};
export default URLWidget;
