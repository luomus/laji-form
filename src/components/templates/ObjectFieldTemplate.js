import * as React from "react";
import { getTemplate } from "@rjsf/utils";
import { getUiOptions } from "../../utils";
import { getButton, getButtonsForPosition } from "./ArrayFieldTemplate";
import ReactContext from "../../ReactContext";

export default function ObjectFieldTemplate(props) {
	const TitleFieldTemplate = getTemplate("TitleFieldTemplate", props.registry, getUiOptions(props.uiSchema));
	const DescriptionFieldTemplate = getTemplate("DescriptionFieldTemplate", props.registry, getUiOptions(props.uiSchema));

	const {ButtonToolbar} = React.useContext(ReactContext).theme;
	let buttons = getGlyphButtons(props);
	const [topButtons, bottomButtons, leftButtons, rightButtons] = ["top", "bottom", "left", "right"].map(pos => {
		const buttons = getButtonsForPosition(props, getUiOptions(props.uiSchema).buttons, pos, "no default");
		return buttons
			? (
				<ButtonToolbar key={`buttons-${pos}`}>
					{buttons}
				</ButtonToolbar>
			)
			: null;
	});

	const {containerClassName, schemaClassName, buttonsClassName} = getObjectTemplateClassNames(props, buttons);

	buttons = <div className={buttonsClassName}>{buttons}</div>;
	const titleUiSchema = {...(props.uiSchema || {}), "_ui:renderedButtons": buttons};

	return (
		<div className={containerClassName}>
			<fieldset className={schemaClassName}>
				{props.title &&
					<TitleFieldTemplate
						id={`${props.idSchema.$id}__title`}
						title={props.title}
						required={props.required || props.uiSchema["ui:required"]}
						uiSchema={titleUiSchema}
						registry={props.registry}
					/>}
				{topButtons}
				{props.description &&
					<DescriptionFieldTemplate
						id={`${props.idSchema.$id}__description`}
						description={props.description}
						registry={props.registry}
					/>
				}
				{leftButtons && (
					<div className="pull-left">
						{leftButtons}
					</div>
				)}
				{props.properties.map(({content}) => content)}
				{rightButtons && (
					<div className="pull-right">
						{rightButtons}
					</div>
				)}
				{bottomButtons}
			</fieldset>
			{!props.title && buttons ? buttons : undefined}
		</div>
	);
}

export function getGlyphButtons(props) {
	const {uiSchema} = props;
	let buttons = uiSchema["ui:buttons"] || [];
	const buttonDescriptions = (getUiOptions(uiSchema).buttons || []).filter(buttonDef => !buttonDef.position);
	if (buttonDescriptions) {
		buttons = [
			...buttons,
			...buttonDescriptions.map(buttonDescription => getButton(buttonDescription, props))
		];
	}

	return buttons
		? props.title
			? buttons.reverse()
			: buttons
		: null;
}


export function getObjectTemplateClassNames(props, buttons) {
	const vertical = props.uiSchema["ui:buttonsVertical"];
	let containerClassName, schemaClassName, buttonsClassName;
	if (buttons && buttons.length) {
		containerClassName = "laji-form-field-template-item" + (vertical ? " keep-vertical" : "");
		schemaClassName = "laji-form-field-template-schema";
		buttonsClassName = "laji-form-field-template-buttons";
		if (props.title) buttonsClassName += " pull-right";
	}
	return {containerClassName, schemaClassName, buttonsClassName};
}
