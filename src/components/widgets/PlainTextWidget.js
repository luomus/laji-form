import React, { PropTypes } from "react";


function PlainTextWidget({id, value}) {
	return (
    <Label {...props}>
      <span className="plainText">{value}</span>
      <input type="hidden" id={id} value={typeof value === "undefined" ? "" : value} />
    </Label>
	);
}

if (process.env.NODE_ENV !== "production") {
  PlainTextWidget.propTypes = {
		id: PropTypes.string.isRequired,
		value: PropTypes.string,
	};
}

export default PlainTextWidget;
