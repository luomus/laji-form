import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { Row, Col } from "react-bootstrap";

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

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		return (
			<Row>
				{this.props.uiSchema["ui:options"].splits.map((split, i) =>
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
		const formData = {};

		const schemas = {
			errorSchema: {},
			idSchema: {},
			formData: {}
		};

		fields.forEach(field => {
			schema.properties[field] = props.schema.properties[field];

			["uiSchema", "errorSchema", "idSchema", "formData"].forEach(schema => {
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
				return update(updatedFormData, {[field]: {$set: formData[field]}});
			}, this.props.formData)
		);
	}
}