import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, getInnerUiSchema } from "../../utils";
import { Row , Col} from "react-bootstrap";
import { Label } from "../components";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class ExtraLabelRowField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				labels: PropTypes.arrayOf(PropTypes.object).isRequired,
				lg: PropTypes.integer,
				md: PropTypes.integer,
				sm: PropTypes.integer,
				xs: PropTypes.integer,
				hiddenXs: PropTypes.boolean
			})
		}).isRequired
	};

	getStateFromProps(props) {
		const propsWithInnerUiSchema = {
			...props,
			schema: {...props.schema, title: ""},
			uiSchema: getInnerUiSchema(props.uiSchema),
			options: getUiOptions(props.uiSchema)
		};

		return {...propsWithInnerUiSchema};
	}

	render() {
		const {SchemaField, TitleField} = this.props.registry.fields;
		const {labels, titleClassName, hiddenXs} = getUiOptions(this.props.uiSchema);
		const cols = [];

		labels.forEach((label, i) => {
			cols.push(this.getColContent(label, i));
		});

		const title = this.props.schema.title !== undefined ? this.props.schema.title : this.props.name;

		return (
			<div>
				{title ? <TitleField title={title} className={titleClassName} help={this.props.uiSchema["ui:help"]} id={this.props.idSchema.$id}/> : null}
				<Row className={"laji-form-label-row" + (hiddenXs ? " hidden-xs" : "")}>{cols}</Row>
				<SchemaField {...this.props} {...this.state}/>
			</div>
		);
	}

	getColContent = (label, i) => {
		const cols = this.getCols(label.size);

		return (
			<Col {...cols} key={i}>
				<Label label={label.label} id={this.props.idSchema.$id} help={label.help}/>
			</Col>
		);
	};

	getCols = (property) => {
		const cols = {lg: 12, md: 12, sm: 12, xs: 12};

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
}
