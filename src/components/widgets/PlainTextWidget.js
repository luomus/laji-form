import React from "react";
import PropTypes from "prop-types";


function PlainTextWidget({id, value}) {
	return (
    <span className="plainText">
      {value}
      <input type="hidden" id={id} value={typeof value === "undefined" ? "" : value} />
    </span>
	);
}

if (process.env.NODE_ENV !== "production") {
	PlainTextWidget.propTypes = {
		id: PropTypes.string.isRequired,
		value: PropTypes.string,
	};
}

export default PlainTextWidget;
