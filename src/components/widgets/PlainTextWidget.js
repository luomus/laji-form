import React from "react";
import PropTypes from "prop-types";
import { getUiOptions } from "../../utils";


function PlainTextWidget(props) {
	const {id, value} = props;
	const {strong} = getUiOptions(props);

	return (
    <span className="plainText">
		{strong ? <strong>{value}</strong> : value}
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
