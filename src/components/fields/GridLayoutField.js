import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { isHidden, getUiOptions, getInnerUiSchema, isEmptyString } from "../../utils";
import { Row , Col } from "react-bootstrap";

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

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let fieldProps = {...props};
		const options = getUiOptions(props.uiSchema);
		const innerUiSchema = getInnerUiSchema(props.uiSchema);

		fieldProps.uiSchema = {...fieldProps.uiSchema, "ui:field": undefined};

		if (options.uiSchema) {
			fieldProps = {...fieldProps, uiSchema: innerUiSchema};
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

		const showLabels = (options && options.hasOwnProperty("showLabels")) ? options.showLabels : true;

		Object.keys(props.schema.properties).forEach(property => {
			const type = props.schema.properties[property].type;
			const shouldHaveOwnRow = (type === "array" || type === "object");

			if (isHidden(props.uiSchema, property)) return;
			if (shouldHaveOwnRow) groupIdx++;
			if (!groups[groupIdx]) groups[groupIdx] = [];
			groups[groupIdx].push(property);
			if (shouldHaveOwnRow) groupIdx++;
		});

		return {...fieldProps, groups, showLabels};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	isRequired = (requirements, name) => {
		return Array.isArray(requirements) &&
			requirements.indexOf(name) !== -1;
	}

	getCols = (ownRow, property) => {
		const cols = {lg: 12, md: 12, sm: 12, xs: 12};

		if (ownRow) return cols;

		const options = getUiOptions(this.props.uiSchema);
		Object.keys(cols).forEach(col => {
			const optionCol = options[col];
			cols[col] = (typeof optionCol === "object") ? optionCol[property] : optionCol;
		});

		return cols;
	}
	
	render() {
		let props = {...this.props, ...this.state};

		let i = 0;
		let fields = [];
		this.state.groups.forEach(group => {
			const SchemaField = this.state.registry.fields.SchemaField;

			group.forEach((property, gi) => {
				const type = this.state.schema.properties[property].type;

				const ownRow = (type === "array" || type === "object");
				const cols = this.getCols(ownRow, property);

				let {title, ...schema} = this.state.schema.properties[property];
				const name = this.state.showLabels ? (title !== undefined ? title : property) : undefined;

				if (this.state.showLabels) schema = {...schema, title};

				if (!isHidden(this.state.uiSchema, property)) fields.push(
					<Col key={"div_" + i} {...cols}>
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
									props.onChange({...this.state.formData, [property]: data});
								}}
						/>
					</Col>
				)
				i++;
			});
		});

		const {title} = this.props.schema;
		let fieldTitle = title !== undefined ? title : this.props.name;
		return (
			<fieldset>
				{!isEmptyString(fieldTitle) ? <TitleField title={fieldTitle} /> : null}
				<Row>
					{fields}
				</Row>
			</fieldset>
		);
	}
}
