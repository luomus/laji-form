import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import { getUiOptions } from "../../utils";
import { Row, Col } from "react-bootstrap";
import FormField from "../BaseComponent";

@FormField
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
		})
	}

	render() {
		return (
			<Row>
				{getUiOptions(this.props.uiSchema).splits.map((split, i) =>
					<Col md={split.md} lg={split.lg} xs={split.xs} sm={split.sm} key={i}>
						{this.renderSplitField(split)}
					</Col>
				)}
			</Row>
		);
	}

	renderSplitField = ({fields, uiSchema, name}) => {
		const {props} = this;
		const schema = {type: "object", properties: {}};

		const schemas = {
			errorSchema: {},
			idSchema: {},
			formData: {}
		};

		fields.forEach(field => {
			schema.properties[field] = props.schema.properties[field];

			[...Object.keys(schemas), "uiSchema"].forEach(schema => {
				const has = props[schema].hasOwnProperty(field);
				const itemSchema = props[schema][field];
				if (has) schemas[schema][field] = itemSchema;
			});
		});

		return (
			<SchemaField
				{...props}
				{...schemas}
				schema={schema}
				uiSchema={uiSchema}
			  name={name}
			  onChange={this.onChange(fields)}
			/>
		);
	}

	onChange = (fields) => (formData) => {
		this.props.onChange(fields.reduce((updatedFormData, field) => {
				return {...updatedFormData, [field]: formData[field]};
			}, this.props.formData)
		);
	}
}