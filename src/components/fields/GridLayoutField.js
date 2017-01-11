import React, { Component, PropTypes } from "react";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { toIdSchema, shouldRender, orderProperties } from  "react-jsonschema-form/lib/utils"
import { isHidden, getUiOptions, getInnerUiSchema, isEmptyString } from "../../utils";
import { Row , Col } from "react-bootstrap";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class GridLayoutField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				lg: PropTypes.integer,
				md: PropTypes.integer,
				sm: PropTypes.integer,
				xs: PropTypes.integer,
				showLabels: PropTypes.boolean
			})
		}).isRequired
	}

	static defaultProps = {
		uiSchema: {
			"ui:options": {
				showLabels: true
			}
		}
	}

	getStateFromProps(props) {
		let fieldProps = {...props};
		const options = getUiOptions(props.uiSchema);
		const innerUiSchema = getInnerUiSchema(props.uiSchema);

		fieldProps = {...fieldProps, uiSchema: {...fieldProps.uiSchema, "ui:field": undefined, ...innerUiSchema}};

		// Apply nested uiSchemas prop effects virtually without rendering them.
		while (true) {
			const uiField = fieldProps.uiSchema["ui:field"];
			if (!uiField) break;

			const field = new props.registry.fields[uiField](fieldProps);
			const innerfieldProps = {...field.props, ...field.state};
			fieldProps = {...fieldProps, ...innerfieldProps};
		}

		const colsToRows = {};
		(options.rows || []).forEach((row, i) => {
			row.forEach(col => {
				colsToRows[col] = i;
			});
		});

		const groups = [];

		const showLabels = (options && options.hasOwnProperty("showLabels")) ? options.showLabels : true;

		return {...fieldProps, groups, showLabels, colsToRows};
	}

	isRequired = (requirements, name) => {
		return Array.isArray(requirements) &&
			requirements.indexOf(name) !== -1;
	}

	getCols = (schema, uiSchema, property) => {
		const cols = {lg: 12, md: 12, sm: 12, xs: 12};

		if ((schema.type === "array" && !(schema.uniqueItems && schema.items.type === "string" && uiSchema === undefined)) ||
			schema.type === "object") {
			return cols;
		}

		const options = getUiOptions(this.props.uiSchema);
		Object.keys(cols).forEach(col => {
			const optionCol = options[col];
			if (typeof optionCol === "object") {
				let selector = undefined;
				if (optionCol[property]) selector = property;
				else if (optionCol["*"]) selector = "*";
				cols[col] = optionCol[selector];
			} else {
				cols[col] = optionCol;
			}
		});

		return cols;
	}
	
	render() {
		const SchemaField = this.state.registry.fields.SchemaField;
		const props = {...this.props, ...this.state};
		const {colsToRows, showLabels} = this.state;

		const {schema, uiSchema} = this.state;

		const rows = [];
		const lastRow = [];

		function getRow(col) {
			const colRow = colsToRows[col];
			if (colRow !== undefined) {
				if (!rows[colRow]) rows[colRow] = [];
				return rows[colRow]
			} else {
				return lastRow
			}
		}

		orderProperties(Object.keys(schema.properties), uiSchema["ui:order"]).forEach((propertyName, i) => {
			const property = this.state.schema.properties[propertyName];
			const uiSchemaProperty = uiSchema[propertyName];
			const cols = this.getCols(property, uiSchemaProperty, propertyName);

			let {title, ...schema} = property;
			const name = showLabels ? (title !== undefined ? title : propertyName) : undefined;

			if (showLabels) schema = {...schema, title};

			if (!isHidden(this.state.uiSchema, propertyName)) getRow(propertyName).push(
				<Col key={"div_" + i} {...cols}>
					<SchemaField
						key={i}
						name={name}
						required={this.isRequired(this.state.schema.required, propertyName)}
						schema={schema}
						uiSchema={this.state.uiSchema[propertyName]}
						idSchema={toIdSchema(
							this.state.idSchema[propertyName],
							 this.state.idSchema.$id + "_" + propertyName,
						  this.props.registry.definitions
						)}
						errorSchema={this.state.errorSchema ? (this.state.errorSchema[propertyName] || {}) : {}}
						formData={this.state.formData[propertyName]}
						registry={this.state.registry}
						onChange={(data) => {
							props.onChange({...this.state.formData, [propertyName]: data});
						}}
					/>
				</Col>
			)
		});

		rows.push(lastRow);

		const {title} = this.props.schema;
		let fieldTitle = title !== undefined ? title : this.props.name;
		return (
			<fieldset>
				{!isEmptyString(fieldTitle) ? <TitleField title={fieldTitle} /> : null}
				{rows.map((row, i) =>
					<Row key={i}>
						{row}
					</Row>
				)}
			</fieldset>
		);
	}
}
