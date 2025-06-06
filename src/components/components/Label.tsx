import * as React from "react";
import { FieldProps } from "../../types";
import { useContext } from "react";
import ReactContext from "../../ReactContext";
import { OverlayTrigger, Help } from "../components";

type Props = {
	label: string;
	children: React.ReactNode;
	id: string;
	required?: boolean;
	registry?: FieldProps["registry"] | Record<string, never>;
	uiSchema?: any
}

export function Label({label, children, id, required, registry = {}, uiSchema = {}}: Props) {
	const {"ui:help": help, "ui:helpHoverable": helpHoverable, "ui:helpPlacement": helpPlacement, labelComponent} = uiSchema;
	const showHelp = label && help;
	const {Tooltip} = useContext(ReactContext).theme;

	const tooltipElem = (
		<Tooltip id={id + "-tooltip"}>{help ? (
			<span>
				<strong dangerouslySetInnerHTML={{__html: label}} /><br />
				<span dangerouslySetInnerHTML={{__html: help}} />
			</span>
		): label}</Tooltip>
	);

	const requiredHtml = required ? "<span class='text-danger'>*</span>" : "";

	const [focused, setFocused] = React.useState(false);

	const onHelpFocus = React.useCallback(() => {
		setFocused(true);
	}, []);

	const onHelpBlur = React.useCallback(() => {
		setFocused(false);
	}, []);

	const onHelpClick = React.useCallback((e) => {
		e.preventDefault();
	}, []);


	const LabelComponent = labelComponent || "label";

	const labelElem = (
		<LabelComponent htmlFor={id} aria-describedby={`${id}--help`}>
			<div style={{ whiteSpace: "normal" }}>
				<span dangerouslySetInnerHTML={{__html: label + requiredHtml}} />
				{showHelp ? <Help focusable={true} onFocus={onHelpFocus} onBlur={onHelpBlur} onClick={onHelpClick} id={id} /> : null}
			</div>
			{children}
		</LabelComponent>
	);

	return help ? <>
		<OverlayTrigger placement={helpPlacement || "right"} overlay={tooltipElem} hoverable={helpHoverable} formContext={registry.formContext} show={focused || undefined} style={{ display: "inline-block" }}>
			{labelElem}
		</OverlayTrigger>
		<div id={`${id}--help`} style={{ display: "none" }}>{ help }</div>
	</> : labelElem;
}
