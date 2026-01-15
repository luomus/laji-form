import * as React from "react";
import { orderProperties, getTemplate } from "@rjsf/utils";
import { getUiOptions, getNestedUiFieldsList, isHidden, isEmptyString, isObject, getUUID, isMultiSelect } from "../../utils";
import { getButtonsForPosition } from "../templates/ArrayFieldTemplate";
import ReactContext from "../../ReactContext";
import { getDefaultRegistry } from "@rjsf/core";
import { getGlyphButtons, getObjectTemplateClassNames } from "../templates/ObjectFieldTemplate";

export default (props) => {
	const id = getUUID(props.formData);
	const formContext = id
		? {...props.formContext, _parentLajiFormId: id}
		: props.formContext;

	const uiSchema = props.uiSchema["ui:grid"] && !props.uiSchema["ui:ObjectFieldTemplate"]
		? {
			...props.uiSchema,
			"ui:ObjectFieldTemplate": GridTemplate
		} : props.uiSchema;

	const {ObjectField} = getDefaultRegistry().fields;
	return <ObjectField {...props} uiSchema={uiSchema} registry={{...props.registry, formContext}} formContext={formContext} />;
};


function GridTemplate(props) {
	const {schema, uiSchema, idSchema, properties} = props;
	const TitleFieldTemplate = getTemplate("TitleFieldTemplate", props.registry, getUiOptions(props.uiSchema));
	const gridOptions = props.uiSchema["ui:grid"] || {};
	const {ButtonToolbar, Row, Col} = React.useContext(ReactContext).theme;

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
			rows[i].push(
				<Col {...titleCols} key={"title_" + i} className={classNames["rowTitle"]}>
					<Label id={idSchema.$id + "_row_" + i}
						label={rowTitles[i].title}
						uiSchema={{"ui:help": rowTitles[i].help}}/>
				</Col>
			);
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
			<Col {...cols} className={classNames[propertyName]} key={propertyName}>
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

	const {containerClassName, schemaClassName, buttonsClassName} = getObjectTemplateClassNames(props, buttons);

	buttons = <div className={buttonsClassName}>{buttons}</div>;
	const titleUiSchema = {...uiSchema, "ui:renderedButtons": buttons};

	return (
		<div className={containerClassName}>
			<fieldset className={schemaClassName}>
				{!isEmptyString(fieldTitle) ?
					<TitleFieldTemplate title={fieldTitle}
						schema={schema}
						uiSchema={titleUiSchema}
						registry={props.registry}
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
