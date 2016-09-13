import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { Row } from "react-bootstrap";

export default class GridLayoutField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				colType: PropTypes.oneOf(["lg", "md", "sm", "xs"]),
				maxItemsPerRow: PropTypes.number,
				showLabels: PropTypes.boolean,
				limitWidthAlways: PropTypes.boolean
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
		let fieldProps = {...props};

		fieldProps.uiSchema = update(fieldProps.uiSchema, {$merge: {"ui:field": undefined}});

		if (fieldProps.uiSchema["ui:options"] && fieldProps.uiSchema["ui:options"].uiSchema) {
			fieldProps = update(fieldProps, {$merge: {uiSchema: fieldProps.uiSchema["ui:options"].uiSchema}});
			for (let prop in fieldProps.schema.properties) {
				if (props.uiSchema[prop]) fieldProps = update(fieldProps, {uiSchema: {$merge: {[prop]: props.uiSchema[prop]}}});
			}

			let field = new props.registry.fields[fieldProps.uiSchema["ui:field"]](fieldProps);
			for (let fieldProp in fieldProps) {
				fieldProps[fieldProp] = field.state[fieldProp] || field.props[fieldProp];
			}
		}

		const groups = [];
		let groupIdx = 0;

		const options = props.uiSchema["ui:options"];
		const colType = (options && options.colType) ? options.colType : "md";
		const maxItemsPerRow = (options && options.maxItemsPerRow
			&& options.maxItemsPerRow > 0 && options.maxItemsPerRow <= 12) ? options.maxItemsPerRow : 6;
		const showLabels = (options && options.hasOwnProperty("showLabels")) ? options.showLabels : true;
		const limitWidth = (options && options.hasOwnProperty("limitWidthAlways")) ? options.limitWidthAlways : false;
		const neverLimitWidth = (options && options.hasOwnProperty("neverLimitWidth")) ? options.neverLimitWidth : false;

		Object.keys(props.schema.properties).forEach(property => {
			const type = props.schema.properties[property].type;
			const shouldHaveOwnRow = (type === "array" || type === "object");

			if (this.isHidden(props, property)) return;
			if (shouldHaveOwnRow || (groups[groupIdx] && groups[groupIdx].length >= maxItemsPerRow)) groupIdx++;
			if (!groups[groupIdx]) groups[groupIdx] = [];
			groups[groupIdx].push(property);
			if (shouldHaveOwnRow) groupIdx++;
		});

		const maxWidth = parseInt(12 / groups.reduce((max, group) => (max !== undefined) ? Math.max(max, group.length) : group.length, 0));

		return {...fieldProps, colType, groups, showLabels, limitWidth, neverLimitWidth, maxWidth};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
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

			const baseDivision = parseInt(12 / group.length);

			const SchemaField = this.state.registry.fields.SchemaField;

			group.forEach((property, gi) => {
				let division = baseDivision;
				if (!gi && group.length > 1) {
					division = 12 - ((Object.keys(group).length - 1) * division);
				}

				const type = this.state.schema.properties[property].type;

				if (!this.state.neverLimitWidth && (this.state.limitWidth ||
						(type !== "array" && type !== "object" &&
							(!this.state.uiSchema[property] || !this.state.uiSchema[property]["ui:widget"] ||
							 this.state.uiSchema[property]["ui:widget"] !== "separatedDateTime")))) {
					division = Math.min(4, division);
				}

				if (type !== "array" && type !== "object") {
					division = Math.min(this.state.maxWidth, division);
				}

				const name = this.state.showLabels ?  (this.state.schema.properties[property].title || property) : undefined;
				let schema = this.state.schema.properties[property];
				if (!this.state.showLabels) schema = update(schema, {title: {$set: undefined}});

				if (!this.isHidden(this.state, property)) fields.push(
					<div key={"div_" + i} className={"col-" + this.state.colType + "-" + division}>
						<SchemaField
							key={i}
							name={name}
							required={this.isRequired(this.state.schema.required, property)}
							schema={schema}
							uiSchema={this.state.uiSchema[property]}
							idSchema={toIdSchema(this.state.idSchema[property], this.state.idSchema.$id + "_" + property, this.props.registry.definitions)}
							errorSchema={this.state.errorSchema ? (this.state.errorSchema[property] || {}) : {}}
							formData={this.state.formData[property]}
							registry={this.state.registry}
							onChange={(data) => {
									let formData = update(this.state.formData, {$merge: {[property]: data}});
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
