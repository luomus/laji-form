import React, { Component } from "react";
import PropTypes from "prop-types";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import { getUiOptions } from "../../utils";
import { Row, Col } from "react-bootstrap";
import BaseComponent from "../BaseComponent";
import { getPropsForFields } from "./NestField";

@BaseComponent
export default class SplitField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				splits: PropTypes.arrayOf(PropTypes.shape({
					fields: PropTypes.arrayOf(PropTypes.string).isRequired,
					uiSchema: PropTypes.object,
					name: PropTypes.string,
					lg: PropTypes.integer,
					md: PropTypes.integer,
					sm: PropTypes.integer,
					xs: PropTypes.integer
				})).isRequired
			}).isRequired
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	render() {
		const { TitleField, DescriptionField } = this.props.registry.fields;
		const {"ui:title": _title} = this.props.uiSchema;
		return (
			<div>
				<TitleField 
					id={`${this.props.idSchema.$id}__title`}
						title={_title !== undefined ? _title : this.props.title}
						required={this.props.required}
						formContext={this.props.formContext}
						className={getUiOptions(this.props.uiSchema).titleClassName}
						help={this.props.uiSchema["ui:help"]}
					/>
				<DescriptionField
					id={`${this.props.idSchema.$id}__description`}
					description={this.props.description}
					formContext={this.props.formContext}
				/>
				<Row>
					{getUiOptions(this.props.uiSchema).splits.map((split, i) =>
						<Col md={split.md} lg={split.lg} xs={split.xs} sm={split.sm} key={i}>
							{this.renderSplitField(split)}
						</Col>
					)}
				</Row>
			</div>
		);
	}

	renderSplitField = ({fields}) => {
		return (
			<SchemaField
				{...this.props}
				{...getPropsForFields(this.props, fields)}
			  onChange={this.onChange(fields)}
				name=""
			/>
		);
	}

	onChange = (fields) => (formData) => {
		this.props.onChange(fields.reduce((updatedFormData, field) => {
			return {...updatedFormData, [field]: formData[field]};
		}, this.props.formData));
	}
}
