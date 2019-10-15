import React from "react";
import PropTypes from "prop-types";

const HiddenField = () => { return <div />; };
HiddenField.propTypes =  {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["object", "array", "string", "number", "boolean"])
	}).isRequired
};

export default HiddenField;
