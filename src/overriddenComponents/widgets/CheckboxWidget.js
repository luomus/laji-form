import React, { PropTypes } from "react";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import HelpGlyph from "../../components/HelpGlyph";

const HELP_FIELD_SYMBOL = "?";

function CheckboxWidget({
	schema,
	id,
	value,
	required,
	disabled,
	placeholder,
	onChange,
	help,
	label,
}) {
	const showGlyph = label && help;
	const labelElem = <strong>{label}{showGlyph ? <HelpGlyph /> : null}</strong>;
	console.log(label);
	const tooltip = showGlyph ? <Tooltip id={id + "-tooltip"}>{help}</Tooltip> : null;
	const elem = (
		<label>
				<input type="checkbox"
					id={id}
					title={placeholder}
					checked={typeof value === "undefined" ? false : value}
					required={required}
					disabled={disabled}
					onChange={(event) => onChange(event.target.checked)} />
			{labelElem}
		</label>
	);
	const container = tooltip ?
		<OverlayTrigger overlay={tooltip} className={`checkbox ${disabled ? "disabled" : ""}`}>{elem}</OverlayTrigger> :
		elem;
	return <div className={`checkbox ${disabled ? "disabled" : ""}`}>{container}</div>
	// const container = (<div className={`checkbox ${disabled ? "disabled" : ""}`}>{elem}</div>);
	// return tooltip ?
	// 	(<OverlayTrigger overlay={tooltip} className={`checkbox ${disabled ? "disabled" : ""}`}>
	// 		{container}
	// 	</OverlayTrigger>) : container;
}
if (process.env.NODE_ENV !== "production") {
	CheckboxWidget.propTypes = {
		schema: PropTypes.object.isRequired,
		id: PropTypes.string.isRequired,
		onChange: PropTypes.func,
		value: PropTypes.bool,
		required: PropTypes.bool,
		placeholder: PropTypes.string,
	};
}

export default CheckboxWidget;

