import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions, formatValue } from "../../utils";

function PlainTextWidget(props) {
	const {id, value} = props;
	const {strong, "ui:widget": formatterWidget, "ui:options": formatterOptions, centered, tag} = getUiOptions(props);

	const formattedValue = formatValue({
		...props,
		uiSchema: formatterWidget ? {"ui:widget": formatterWidget, options: formatterOptions} : props.uiSchema,
		schema: props.schema,
		formData: props.value
	});
	const Tag = tag || "span";
	return (
		<Tag className={`plainText${centered ? " horizontally-centered row-height": ""}`}>
			{strong ? <strong>{formattedValue}</strong> : formattedValue}
			<input type="hidden" id={id} value={typeof value === "undefined" ? "" : value} />
		</Tag>
	);
}

if (process.env.NODE_ENV !== "production") {
	PlainTextWidget.propTypes = {
		id: PropTypes.string.isRequired,
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string", "number", "integer"])
		})
	};
}

export default PlainTextWidget;
