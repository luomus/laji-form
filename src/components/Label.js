import React from "react";
import { Tooltip, OverlayTrigger } from "react-bootstrap";

export default ({label, help, children, id}) => {
	const showGlyph = label && help;

	const helpGlyph = <span className="label-info laji-form-help-glyph">?</span>;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>{help ? (
		<span>
			<strong>{label}</strong><br />
			{help}
		</span>
	): label}</Tooltip>;

	const labelElem = (
		<label htmlFor={id}>
			<strong>{label}{showGlyph ? helpGlyph : null}</strong>
			{children}
		</label>
	)

	return (label || help) ? (
		<OverlayTrigger placement="right" overlay={tooltipElem}>
			{labelElem}
		</OverlayTrigger>
	) : labelElem;
}
