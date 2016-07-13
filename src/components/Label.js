import React from "react";
import { Tooltip, OverlayTrigger } from "react-bootstrap";

export default ({label, help, children, id, disabled}) => {
	const showGlyph = label && help;

	const helpGlyph = <span className="label-info laji-form-help-glyph">?</span>;

	const labelElem = (
		<label>
			{children}
			<strong>{label}{showGlyph ? helpGlyph : null}</strong>
		</label>
	);

	const tooltipElem = showGlyph ? <Tooltip id={id + "-tooltip"}>{help}</Tooltip> : null;

	return tooltipElem ?
		<OverlayTrigger overlay={tooltipElem} className={`checkbox ${disabled ? "disabled" : ""}`}>{labelElem}</OverlayTrigger> :
		labelElem;
}
