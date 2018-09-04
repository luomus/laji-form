import React from "react";
import { Help } from "../components";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { isEmptyString, parseJSONPointer } from "../../utils";
import Context from "../../Context";

export default ({title, className, buttons, help, id, formData, titleFormatters = []}) => {
	const renderedFormatters = titleFormatters.map((titleFormatter) => {
		const {renderer} = titleFormatter;
		return _titleFormatters[renderer]({...titleFormatter, formData});
	}).filter(i => i);

	if (renderedFormatters.length === 0 && isEmptyString(title)) return null;

	const helpComponent = help ? <Help /> : null;

	const titleContent = <span><span>{renderedFormatters}</span> {title} {helpComponent} {buttons}</span>;

	const Legend = ({children}) => (
		<legend className={className}>{children}</legend>
	);

	if (!help) return <Legend>{titleContent}</Legend>;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>
							<span>
								<strong>{title}</strong><br />
								{help}
							</span>
						</Tooltip>;

	return (
		<Legend>
			<OverlayTrigger placement="right" overlay={tooltipElem}>
				{titleContent}
			</OverlayTrigger>
		</Legend>
	);
};

const _titleFormatters = {
	informalTaxonGroup: ({formData, value, renderer}) => {
		const informalTaxonGroup = parseJSONPointer(formData, value, !!"safely");
		const {informalTaxonGroupsById = {}} = new Context();
		const name = informalTaxonGroupsById[informalTaxonGroup] ? informalTaxonGroupsById[informalTaxonGroup].name : "";
		return informalTaxonGroup ? <span key={renderer}><div className={`informal-group-image ${informalTaxonGroup}`} /> {name}</span> : undefined;
	}
};
