import React, { Component } from "react";
import PropTypes from "prop-types";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import BaseComponent from "../BaseComponent";
import { Row , Col } from "react-bootstrap";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { toIdSchema, orderProperties } from  "react-jsonschema-form/lib/utils";
import { getUiOptions, getInnerUiSchema, isHidden, isEmptyString } from "../../utils";

@BaseComponent
export default class InlineLabelsField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				lg: PropTypes.oneOfType([
					PropTypes.shape({
						labels: PropTypes.number,
						fields: PropTypes.number
					}),
					PropTypes.number
				]).isRequired,
				md: PropTypes.oneOfType([
					PropTypes.shape({
						labels: PropTypes.number,
						fields: PropTypes.number
					}),
					PropTypes.number
				]).isRequired,
				sm: PropTypes.oneOfType([
					PropTypes.shape({
						labels: PropTypes.number,
						fields: PropTypes.number
					}),
					PropTypes.number
				]).isRequired,
				xs: PropTypes.oneOfType([
					PropTypes.shape({
						labels: PropTypes.number,
						fields: PropTypes.number
					}),
					PropTypes.number
				]).isRequired
			}).isRequired
		})
	};

	getStateFromProps(props) {
		const propsWithInnerUiSchema = {
			...props,
			schema: {...props.schema},
			uiSchema: getInnerUiSchema(props.uiSchema),
			options: getUiOptions(props.uiSchema)
		};

		return {...propsWithInnerUiSchema};
	}

	render() {
		const SchemaField = this.state.registry.fields.SchemaField;
		const options = getUiOptions(this.props.uiSchema);
		const titleCols = this.getCols(options, "labels");
		const fieldCols = this.getCols(options, "fields");

		const rows = orderProperties(Object.keys(this.state.schema.properties), this.state.uiSchema["ui:order"]).map((propertyName) => {
			const property = this.state.schema.properties[propertyName];

			if (!property || isHidden(this.state.uiSchema, propertyName)) return null;

			const uiSchema = this.state.uiSchema[propertyName];
			const {title, ...schema} = property;
			const idSchema = toIdSchema(
                property,
                this.state.idSchema[propertyName].$id,
                this.props.registry.definitions
            );

			const tooltip = <Tooltip id={this.props.idSchema.$id + "_tooltip"}>{title}</Tooltip>;

			return (
				<div>
					<Col {...titleCols}>
						<div>
							<OverlayTrigger overlay={tooltip}>
								<label><strong>{title}</strong></label>
							</OverlayTrigger>
						</div>
					</Col>
					<Col {...fieldCols}>
						<SchemaField
							{...this.props}
							name=""
							schema={schema}
							uiSchema={uiSchema}
							idSchema={idSchema}
							errorSchema={this.state.errorSchema ? (this.state.errorSchema[propertyName] || {}) : {}}
							formData={this.state.formData ? this.state.formData[propertyName] : undefined}
							registry={this.state.registry}/>
					</Col>
				</div>
			);
		});

		const {title} = this.props.schema;
		const fieldTitle = title !== undefined ? title : this.props.name;

		return (
			<fieldset>
                {!isEmptyString(fieldTitle) ? <TitleField title={fieldTitle} /> : null}
                {(rows).map((row, i) =>
					<Row key={i}>{row}</Row>
                )}
			</fieldset>
		);
	}

	getCols = (options, property) => {
		const cols = {lg: 12, md: 12, sm: 12, xs: 12};

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
}
