import React from "react";
import { Help } from "../components";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { isEmptyString, parseJSONPointer } from "../../utils";
import Context from "../../Context";

const TitleField = ({title, className, buttons, help, id, formData, titleFormatters = []}) => {
	const renderedFormatters = titleFormatters.map((titleFormatter) => {
		const {renderer} = titleFormatter;
		return _titleFormatters[renderer]({...titleFormatter, formData});
	}).filter(i => i);

	if (renderedFormatters.length === 0 && isEmptyString(title)) return <div className="margin-top" />;

	const helpComponent = help ? <Help /> : null;

	const titleContent = <span><span>{renderedFormatters}</span> {title} {helpComponent} {buttons}</span>;


	if (!help) return <legend className={className}>{titleContent}</legend>;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>
							<span>
								<strong>{title}</strong><br />
								{help}
							</span>
						</Tooltip>;

	return (
		<legend className={className}>
			<OverlayTrigger placement="right" overlay={tooltipElem}>
				{titleContent}
			</OverlayTrigger>
		</legend>
	);
};

export default TitleField;

const _titleFormatters = {
	informalTaxonGroup: ({formData, value, renderer}) => {
		const informalTaxonGroup = parseJSONPointer(formData, value, !!"safely");
		const {informalTaxonGroupsById = {}} = new Context();
		const name = informalTaxonGroupsById[informalTaxonGroup] ? informalTaxonGroupsById[informalTaxonGroup].name : "";
		return informalTaxonGroup ? <span key={renderer}><div className={`informal-group-image ${informalTaxonGroup}`} /> {name}</span> : undefined;
	}
};
