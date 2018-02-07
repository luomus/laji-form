import React from "react";
import Context from "../Context";
import { Label, Help } from "./components";
import { isMultiSelect } from "../utils";

export default function FieldTemplate({
	id,
	classNames,
	label,
	children,
	rawErrors,
	rawHelp,
	description,
	hidden,
	required,
	displayLabel,
	schema,
	uiSchema,
	formContext
	}) {

	if (hidden || uiSchema["ui:field"] === "HiddenField") {
		return children;
	}
	const inlineHelp = uiSchema["ui:inlineHelp"];
	const belowHelp = uiSchema["ui:belowHelp"];
	const ids = new Context(`${formContext.contextId}_IDS`);
	const htmlId = `_laji-form_${formContext.contextId}_${id}`;
	let elemId = undefined;
	if (!ids[htmlId]  || ids[htmlId] === this) {
		ids[htmlId] = this;
		elemId = htmlId;
	}

	const _displayLabel = (schema.items && schema.items.enum && !isMultiSelect(schema, uiSchema)) ? false : displayLabel;

	let warnings = [];
	const errors = (rawErrors || []).reduce((arr, err) => {
		if (err.indexOf("[warning]") > -1) {
			warnings.push(err.substring("[warning]".length));
		} else {
			arr.push(err);
		}
		return arr;
	}, []);
	if (warnings.length === 0) warnings = formContext.getWarnings(children.props.formData, id);
	const warningClassName = (warnings.length > 0 && errors.length === 0) ? " laji-form-warning-container" : "";

	return (
		<div className={classNames + warningClassName} id={elemId}>
			{label && _displayLabel ? <Label label={label} help={rawHelp} id={id} required={required} /> : null}
			{_displayLabel && description ? description : null}
			<div>
				{inlineHelp ? <div className="pull-left">{children}</div> : children}
				{inlineHelp ? (
					<div className="pull-left"><Help help={inlineHelp} id={`${elemId}-inline-help`} /></div>
					) : null
				}
			</div>
			{belowHelp ? 
				<div className="small text-muted" dangerouslySetInnerHTML={{__html: belowHelp}} /> :
				null
			}
			{errors.length > 0 ?
				<div id={`laji-form-error-container-${id}`}>
					<p></p>
					<ul>
						{errors.map((error, i) => (
							<li key={i} className="text-danger">{error}</li>
						))}
					</ul>
				</div> : null}
			{warnings.length > 0 ?
				<div id={`laji-form-warning-container-${id}`}>
					<p></p>
					<ul>
						{warnings.map((warning, i) => (
							<li key={i} className="text-warning">{warning}</li>
						))}
					</ul>
				</div> : null}
		</div>
	);
}

