import React, { Component } from "react";
import PropTypes from "prop-types";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import BaseComponent from "../BaseComponent";
import { Row , Col } from "react-bootstrap";
import { getUiOptions, getInnerUiSchema } from "../../utils";

@BaseComponent
export default class InlineLabelField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				lg: PropTypes.oneOfType([
					PropTypes.shape({
						label: PropTypes.number,
						field: PropTypes.number
					}),
					PropTypes.number
				]).isRequired,
				md: PropTypes.oneOfType([
					PropTypes.shape({
						label: PropTypes.number,
						field: PropTypes.number
					}),
					PropTypes.number
				]).isRequired,
				sm: PropTypes.oneOfType([
					PropTypes.shape({
						label: PropTypes.number,
						field: PropTypes.number
					}),
					PropTypes.number
				]).isRequired,
				xs: PropTypes.oneOfType([
					PropTypes.shape({
						label: PropTypes.number,
						field: PropTypes.number
					}),
					PropTypes.number
				]).isRequired,
				showChildLabels: PropTypes.boolean
			}).isRequired
		})
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
		const SchemaField = this.state.registry.fields.SchemaField;
		const options = getUiOptions(this.props.uiSchema);
		const titleCols = this.getCols(options, "label");
		const fieldCols = this.getCols(options, "field");

		const tooltip = <Tooltip id={this.props.idSchema.$id + "_tooltip"}>{this.props.schema.title}</Tooltip>;

		return (
			<Row>
				<Col {...titleCols}>
					{options.showChildLabels ? <label className="hidden-xs"><strong>&nbsp;</strong></label> : null}
					<div>
						<OverlayTrigger overlay={tooltip}>
							<label><strong>{this.props.schema.title}</strong></label>
						</OverlayTrigger>
					</div>
				</Col>
				<Col {...fieldCols}>
					<SchemaField {...this.props} {...this.state}/>
				</Col>
			</Row>
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
