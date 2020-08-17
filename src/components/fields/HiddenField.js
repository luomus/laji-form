import * as React from "react";
import * as PropTypes from "prop-types";

const HiddenField = () => { return <div />; };
HiddenField.propTypes =  {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["object", "array", "string", "number", "boolean", "integer"])
	}).isRequired
};

export default HiddenField;
