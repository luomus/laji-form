import * as React from "react";
import { Help, OverlayTrigger } from "../components";
import { isEmptyString, parseJSONPointer } from "../../utils";
import Context from "../../Context";
import ReactContext from "../../ReactContext";

const TitleField = ({title, className, buttons, help, helpHoverable, id, formData, titleFormatters = [], style, contextId}) => {
	const renderedFormatters = titleFormatters.map((titleFormatter) => {
		const {renderer} = titleFormatter;
		return _titleFormatters[renderer]({...titleFormatter, formData});
	}).filter(i => i);

	const {Tooltip} = React.useContext(ReactContext).theme;

	if (renderedFormatters.length === 0 && isEmptyString(title)) return null;

	const helpComponent = help ? <Help /> : null;

	const titleContent = <span><span>{renderedFormatters}</span> <span dangerouslySetInnerHTML={{__html: title}} /> {helpComponent} {buttons}</span>;

	const Legend = ({children, ...props}) => <legend className={className} style={style} {...props}>{children}</legend>;

	if (!help) return <Legend>{titleContent}</Legend>;


	const tooltipElem = (
		<Tooltip id={id + "-tooltip"}>
			<span>
				<strong dangerouslySetInnerHTML={{__html: title}} /><br />
				<span dangerouslySetInnerHTML={{__html: help}} />
			</span>
		</Tooltip>
	);

	return (
		<Legend>
			<OverlayTrigger placement="right" overlay={tooltipElem} hoverable={helpHoverable} contextId={contextId}>
				{titleContent}
			</OverlayTrigger>
		</Legend>
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
