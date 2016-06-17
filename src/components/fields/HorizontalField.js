import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { Row, Col } from "react-bootstrap";

export default class HorizontalField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema} = props;
		uiSchema = update(uiSchema, {$merge: {"ui:field": undefined}});

		const groups = [];
		let groupIdx = 0;

		Object.keys(props.schema.properties).forEach(property => {
			const type = props.schema.properties[property].type;
			const shouldHaveOwnRow = (type === "array" || type === "object");

			if (this.isHidden(props, property)) return;
			if (shouldHaveOwnRow || (groups[groupIdx] && groups[groupIdx].length >= 6)) groupIdx++;
			if (!groups[groupIdx]) groups[groupIdx] = [];
			groups[groupIdx].push(property);
			if (shouldHaveOwnRow) groupIdx++;
		});

		return {uiSchema, groups};
	}

	isHidden = (props, property) => {
		let {uiSchema} = props;
		if (uiSchema[property]) uiSchema = uiSchema[property];
		return !uiSchema || uiSchema["ui:widget"] == "hidden" || uiSchema["ui:field"] == "hidden";
	}
	
	isRequired = (requirements, name) => {
		return Array.isArray(requirements) &&
			requirements.indexOf(name) !== -1;
	}
	
	render() {
		let props = {...this.props, ...this.state};

		let i = 0;
		let fields = [];
		this.state.groups.forEach(group => {

			const division = parseInt(12 / group.length);

			// make first division take rest of the total width divided by 12
			let firstDivision = division + (12 - (Object.keys(group).length * division));

			group.forEach((property, gi) => {
				if (!this.isHidden(props, property)) fields.push(
					<Col key={"div_" + i} md={(gi === 0) ? firstDivision : division}>
						<SchemaField
							key={i}
							name={props.schema.properties[property].title || property}
							required={this.isRequired(props.schema.required, property)}
							schema={props.schema.properties[property]}
							uiSchema={props.uiSchema[property]}
							idSchema={{id: props.idSchema.id + "_" + property}}
							errorSchema={props.errorSchema ? (props.errorSchema[property] || {}) : {}}
							formData={props.formData[property]}
							registry={props.registry}
							onChange={(data) => {
									let formData = update(this.props.formData, {$merge: {[property]: data}});
									props.onChange(formData);
								}}
						/>
					</Col>
				)
				i++;
			})
		});

		let title = this.props.schema.title || this.props.name;
		return (
			<fieldset>
				{(title !== undefined && title !== "") ? <TitleField title={title} /> : null}
				<Row>
					{fields}
				</Row>
			</fieldset>
		);
	}
}
