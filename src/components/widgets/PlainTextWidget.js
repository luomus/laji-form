import React from "react";
import PropTypes from "prop-types";
import { getUiOptions, formatValue } from "../../utils";


function PlainTextWidget(props) {
	const {id, value} = props;
	const {strong, "ui:widget": formatterWidget, "ui:options": formatterOptions} = getUiOptions(props);

	const formattedValue = formatValue({
		...props,
		uiSchema: formatterWidget ? {field: {"ui:widget": formatterWidget, options: formatterOptions}} : {field: props.uiSchema},
		schema: {properties: {field: props.schema}},
		formData: {field: props.value}
	}, "field");
	return (
    <span className="plainText">
		{strong ? <strong>{formattedValue}</strong> : formattedValue}
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
