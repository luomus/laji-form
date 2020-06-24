import React from "react";
import ObjectField from "react-jsonschema-form/lib/components/fields/ObjectField";
import { orderProperties, isMultiSelect } from "react-jsonschema-form/lib/utils";
import { Row , Col, ButtonToolbar } from "react-bootstrap";
import { getUiOptions, getNestedUiFieldsList, isHidden, isEmptyString, isObject, getUUID } from "../../utils";
import { getButton, getButtonsForPosition } from "../ArrayFieldTemplate";

export default (props) => {
	const Template = props.uiSchema["ui:grid"] ? GridTemplate : ObjectFieldTemplate;
	const id = getUUID(props.formData);
	const formContext = id
		? {...props.formContext, _parentLajiFormId: id}
		: props.formContext;
	return <ObjectField {...props} registry={{...props.registry, ObjectFieldTemplate: Template, formContext}} formContext={formContext} />;
};

function ObjectFieldTemplate(props) {
	const { TitleField, DescriptionField } = props;

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

	const {containerClassName, schemaClassName, buttonsClassName} = getClassNames(props, buttons);

	buttons = <div className={buttonsClassName}>{buttons}</div>;

	return (
		<div className={containerClassName}>
			<fieldset className={schemaClassName}>
				{props.title &&
					<TitleField
						id={`${props.idSchema.$id}__title`}
						title={props.title}
						required={props.required || props.uiSchema["ui:required"]}
						formContext={props.formContext}
						className={getUiOptions(props.uiSchema).titleClassName}
						help={props.uiSchema["ui:help"]}
						buttons={buttons}
					/>}
				{topButtons}
				{props.description &&
					<DescriptionField
						id={`${props.idSchema.$id}__description`}
						description={props.description}
						formContext={props.formContext}
					/>}
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

function GridTemplate(props) {
	const {schema, uiSchema, idSchema, properties, TitleField} = props;
	const gridOptions = props.uiSchema["ui:grid"] || {};

	const rows = [];
	const lastRow = [];

	const colsToRows = {};
	(gridOptions.rows || []).forEach((row, i) => {
		row.forEach(col => {
			colsToRows[col] = i;
		});
	});

	const {rowTitles = [], classNames = {}} = gridOptions;
	const {Label} = props.formContext;

	const addRowTitles = (rows, rowTitles) => {
		for (let i = 0; i < rowTitles.length; i++) {
			rows[i] = [];
			const titleCols = getCols(props, {type: "string"}, uiSchema["rowTitle"], "rowTitle");
			rows[i].push(<Col {...titleCols} key={"title_" + i} className={classNames["rowTitle"]}>
							<Label id={idSchema.$id + "_row_" + i}
								   label={rowTitles[i].title}
								   help={rowTitles[i].help}/>
						</Col>);
		}
	};

	function getRow(col, colsToRows, rows) {
		const colRow = colsToRows[col];
		if (colRow !== undefined) {
			if (!rows[colRow]) rows[colRow] = [];
			return rows[colRow];
		} else {
			return lastRow;
		}
	}

	addRowTitles(rows, rowTitles);

	orderProperties(Object.keys(schema.properties), uiSchema["ui:order"]).forEach(propertyName => {
		const property = schema.properties[propertyName];

		if (!property) return;

		const uiSchemaProperty = uiSchema[propertyName];
		const cols = getCols(props, property, uiSchemaProperty, propertyName);

		const propertiesByName = properties.reduce((propertiesByName, _prop) => {
			propertiesByName[_prop.name] = _prop;
			return propertiesByName;
		}, {});

		if (!isHidden(uiSchema, propertyName)) getRow(propertyName, colsToRows, rows).push(
			<Col key={propertyName} {...cols} className={classNames[propertyName]}>
				{propertiesByName[propertyName].content}
			</Col>
		);
	});

	if (lastRow.length > 0) rows.push(lastRow);

	const {title} = schema;
	const {"ui:title": _title} = uiSchema;
	let fieldTitle = _title || (title !== undefined ? title : props.name);

	let buttons = getGlyphButtons(props);
	const [topButtons, bottomButtons, leftButtons, rightButtons] = ["top", "bottom", "left", "right"].map(pos => {
		const buttons = getButtonsForPosition(props, getUiOptions(uiSchema).buttons, pos, "no default");
		return buttons
			? (
				<ButtonToolbar key={`buttons-${pos}`}>
					{getButtonsForPosition(props, getUiOptions(uiSchema).buttons, pos, "no default")}
				</ButtonToolbar>
			) : null;
	});

	const {containerClassName, schemaClassName, buttonsClassName} = getClassNames(props, buttons);

	buttons = <div className={buttonsClassName}>{buttons}</div>;

	return (
		<div className={containerClassName}>
			<fieldset className={schemaClassName}>
				{!isEmptyString(fieldTitle) ?
					<TitleField title={fieldTitle}
								className={getUiOptions(props.uiSchema).titleClassName}
								buttons={buttons}
								help={uiSchema["ui:help"]}
								id={idSchema.$id} /> : null}
				{topButtons}
				{leftButtons && <div className="pull-left">{leftButtons}</div>}
				{rows.map((row, i) =>
					<Row key={i}>
						{row}
					</Row>
				)}
				{rightButtons && <div className="pull-right">{rightButtons}</div>}
				{bottomButtons}
			</fieldset>
			{!props.title && buttons ? buttons : null}
	</div>
	);
}

function getCols(props, schema, uiSchema, property) {
	const options = props.uiSchema["ui:grid"];
	const cols = {lg: 12, md: 12, sm: 12, xs: 12};
	const uiField = uiSchema && uiSchema["ui:field"] ? uiSchema["ui:field"] : undefined;

	Object.keys(cols).forEach(col => {
		const optionCol = options[col];
		if (
			(!isObject(optionCol) || !optionCol[property])
			&& schema.type === "array"
			&& !(
				schema.items && schema.items.enum && isMultiSelect(schema, uiSchema)
				|| uiField === "SingleItemArrayField"
				|| (schema.items && schema.items.type === "string" && uiField !== "ImageArrayField" && uiField !== "AudioArrayField")
			)
			|| (schema.type === "string" && uiSchema && getNestedUiFieldsList(uiSchema).includes("SelectTreeField"))
		) {
			return cols;
		}
		if (isObject(optionCol)) {
			let selector = undefined;
			if (optionCol[property]) selector = property;
			else if (optionCol["*"]) selector = "*";
			cols[col] = parseInt(optionCol[selector]);
		} else {
			cols[col] = parseInt(optionCol);
		}
	});

	return cols;
}

function getClassNames(props, buttons) {
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

function getGlyphButtons(props) {
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
