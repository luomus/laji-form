import * as React from "react";
import * as PropTypes from "prop-types";


function HiddenWidget({id, value}) {
	return (
		<input type="hidden" id={id} value={typeof value === "undefined" ? "" : value} />
	);
}

HiddenWidget.propTypes = {
	id: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number,
		PropTypes.bool,
	]),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string", "number", "boolean", "integer"])
	}).isRequired
};

export default HiddenWidget;
