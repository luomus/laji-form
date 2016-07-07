import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { Row, Col } from "react-bootstrap";

export default class GridLayoutField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				colType: PropTypes.oneOf(["lg", "md", "sm", "xs"]),
				maxItemsPerRow: PropTypes.number,
				showLabels: PropTypes.boolean,
				limitWidth: PropTypes.boolean
			})
		}).isRequired
	}

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

		const options = props.uiSchema["ui:options"];
		const maxItemsPerRow = (options && options.maxItemsPerRow
			&& options.maxItemsPerRow > 0 && options.maxItemsPerRow <= 12) ? options.maxItemsPerRow : 6;
		const showLabels = (options && options.hasOwnProperty("showLabels")) ? options.showLabels : true;
		const limitWidth = (options && options.hasOwnProperty("limitWidth")) ? options.showLabels : true;

		Object.keys(props.schema.properties).forEach(property => {
			const type = props.schema.properties[property].type;
			const shouldHaveOwnRow = (type === "array" || type === "object");

			if (this.isHidden(props, property)) return;
			if (shouldHaveOwnRow || (groups[groupIdx] && groups[groupIdx].length >= maxItemsPerRow)) groupIdx++;
			if (!groups[groupIdx]) groups[groupIdx] = [];
			groups[groupIdx].push(property);
			if (shouldHaveOwnRow) groupIdx++;
		});

		return {uiSchema, groups, showLabels, limitWidth};
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

		const options = props.uiSchema["ui:options"];
		const colType = (options && options.colType) ? options.colType : "md";

		let i = 0;
		let fields = [];
		this.state.groups.forEach(group => {

			let division = parseInt(12 / group.length);

			const SchemaField = this.props.registry.fields.SchemaField;

			group.forEach((property, gi) => {
				if (!gi) division = division + (12 - (Object.keys(group).length * division));

				const type = props.schema.properties[property].type;
				if (this.state.limitWidth && type !== "array" && type !== "object" && (!props.uiSchema[property] || !props.uiSchema[property]["ui:widget"] || props.uiSchema[property]["ui:widget"] !== "separatedDateTime")) {
					division = Math.min(4, division);
				}

				const name = this.state.showLabels ?  (props.schema.properties[property].title || property) : undefined;
				let schema = props.schema.properties[property];
				if (!this.state.showLabels) schema = update(schema, {title: {$set: undefined}});
				if (!this.isHidden(props, property)) fields.push(
					<div key={"div_" + i} className={"col-" + colType + "-" + division}>
						<SchemaField
							key={i}
							name={name}
							required={this.isRequired(props.schema.required, property)}
							schema={schema}
							uiSchema={props.uiSchema[property]}
							idSchema={{$id: props.idSchema.$id + "_" + property}}
							errorSchema={props.errorSchema ? (props.errorSchema[property] || {}) : {}}
							formData={props.formData[property]}
							registry={props.registry}
							onChange={(data) => {
									let formData = update(this.props.formData, {$merge: {[property]: data}});
									props.onChange(formData);
								}}
						/>
					</div>
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
