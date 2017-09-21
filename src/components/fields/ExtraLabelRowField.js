import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, getInnerUiSchema } from "../../utils";
import { Row , Col, Tooltip, OverlayTrigger } from "react-bootstrap";
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
				xs: PropTypes.integer
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
		const {labels, titleClassName} = getUiOptions(this.props.uiSchema);
		const cols = [];

		labels.forEach((property, i) => {
			cols.push(this.getColContent(property, Object.keys(property)[0], i));
		});

		const title = this.props.schema.title !== undefined ? this.props.schema.title : this.props.name;

		return (
			<div>
				{title ? <TitleField title={title} className={titleClassName} /> : null}
				<Row className="laji-form-label-row">{cols}</Row>
				<SchemaField {...this.props} {...this.state}/>
			</div>
		);
	}

	getColContent = (obj, property, i) => {
		const cols = this.getCols(property);
		const value = obj[property];

		if (Array.isArray(value)) {
			const innerCols = [];
			value.forEach((childProp, j) => {
				innerCols.push(this.getColContent(childProp, Object.keys(childProp)[0], j));
			});

			return (
				<Col {...cols} key={i}>
					<Row>{innerCols}</Row>
				</Col>
			);
		} else {
			const tooltip = <Tooltip id={this.props.idSchema.$id + "_label_" + i + "_tooltip"}>{value}</Tooltip>;

			return (
				<Col {...cols} key={i}>
					<div>
						<OverlayTrigger overlay={tooltip}>
							<label><strong>{value}</strong></label>
						</OverlayTrigger>
					</div>
				</Col>
			);
		}
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

			if (cols[col] === 0) {
				cols[col + "Hidden"] = true;
			}
		});

		return cols;
	}
}
