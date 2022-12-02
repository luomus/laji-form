import * as React from "react";
import { Help, OverlayTrigger } from "../components";
import { isEmptyString, parseJSONPointer, classNames, getUiOptions } from "../../utils";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";

const TitleField = ({title, id, formData, style, uiSchema = {}, registry = {}}) => {
	const {
		"ui:help": help,
		"ui:helpHoverable": helpHoverable,
		"_ui:renderedButtons": buttons
	} = uiSchema;
	const {titleClassName: className, titleFormatters = []} = getUiOptions(uiSchema);

	const renderedFormatters = titleFormatters.map((titleFormatter) => {
		const {renderer} = titleFormatter;
		return _titleFormatters[renderer]({...titleFormatter, formData});
	}).filter(i => i);

	const {Tooltip} = React.useContext(ReactContext).theme;

	if (renderedFormatters.length === 0 && isEmptyString(title)) {
		return null;
	}

	const helpComponent = help ? <Help /> : null;

	let titleTextContent = (
		<React.Fragment>
			<span dangerouslySetInnerHTML={{__html: title}} /> {helpComponent}
		</React.Fragment>
	);

	if (help) {
		const tooltipElem = (
			<Tooltip id={id + "-tooltip"}>
				<span>
					<strong dangerouslySetInnerHTML={{__html: title}} /><br />
					<span dangerouslySetInnerHTML={{__html: help}} />
				</span>
			</Tooltip>
		);

		titleTextContent = (
			<OverlayTrigger placement="right" overlay={tooltipElem} hoverable={helpHoverable} formContext={registry.formContext}>
				{titleTextContent}
			</OverlayTrigger>
		);
	}

	return (
		<legend className={classNames(className, help && "has-help")} style={style}>
			<span><span>{renderedFormatters}</span> {titleTextContent} {buttons}</span>
		</legend>
	);
};

export default TitleField;

const _titleFormatters = {
	informalTaxonGroup: ({formData, value, renderer}) => {
		const informalTaxonGroup = parseJSONPointer(formData, value, !!"safely");
		const {informalTaxonGroupsById = {}} = getContext();
		const name = informalTaxonGroupsById[informalTaxonGroup] ? informalTaxonGroupsById[informalTaxonGroup].name : "";
		return informalTaxonGroup ? <span key={renderer}><div className={`informal-group-image ${informalTaxonGroup}`} /> {name}</span> : undefined;
	}
};
