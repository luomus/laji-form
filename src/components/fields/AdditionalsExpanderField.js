import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TableField from "./TableField";
import HorizontalSchemaField from "./HorizontalSchemaField";
import Button from "../Button";

/**
 * Additionals to hide by default and shown on demand are defined in uiSchema:
 * uiSchema = {"ui:options": {
 *  "additionalFields: [string]
 *  "expanderButtonText": "string"
 *  "contractorButtonText": "string"
 *  "uiSchemField": "string"
 * }
 *
 * Additional buttons are given as children.
 */
export default class AdditionalsExpanderField extends Component {
	constructor(props) {
		super(props);
		this.state = {showAdditional: false};
	}

	render() {
		return (
			<div className="expandable-field-container">
				{this.renderSchema()}
				{this.renderButtons()}
			</div>);
	}

	renderSchema = () => {
		return (
			<SchemaField
				{...this.props}
				schema={this.getSchema()}
				uiSchema={this.getUiSchema()}
			/>
		)
	}

	getSchema = () => {
		const schema = this.props.schema;
		const uiSchema = this.props.uiSchema;
		if (this.state.showAdditional || !uiSchema["ui:options"] || (uiSchema["ui:options"] && !uiSchema["ui:options"].additionalFields)) {
			return schema;
		} else if (uiSchema && uiSchema["ui:options"] && uiSchema["ui:options"].additionalFields) {
			let dictionarifiedAdditionals = {};
			uiSchema["ui:options"].additionalFields.forEach((option) => {
				dictionarifiedAdditionals[option] = true;
			})
			let filteredSchema = {};
			Object.keys(schema.properties).forEach((prop) => {
				if (!dictionarifiedAdditionals[prop]) filteredSchema[prop] = schema.properties[prop];
			});
			return update(schema, {properties: {$set: filteredSchema}, "ui:field": {$set: undefined}});
		}
		throw "bad schema for AdditionalsExpanderField";
	}

	getUiSchema = () => {
		return (this.props.uiSchema && this.props.uiSchema["ui:options"] && this.props.uiSchema["ui:options"].innerUiField) ?
			{"ui:field": this.props.uiSchema["ui:options"].innerUiField } : {};
	}

	renderButtons = () => {
		let expanderText = "Lisää";
		if (this.props.uiSchema && this.props.uiSchema["ui:options"] && this.props.uiSchema["ui:options"].expanderButtonText) expanderText = this.props.uiSchema["ui:options"].expanderButtonText;
		let contractorText = "Vähemmän";
		if (this.props.uiSchema && this.props.uiSchema["ui:options"] && this.props.uiSchema["ui:options"].contractorButtonText) contractorText = this.props.uiSchema["ui:options"].contractorButtonText;

		let button = this.state.showAdditional ?
				<Button text={contractorText} onClick={this.dontShowAdditional} /> :
				<Button text={expanderText} onClick={this.showAdditional} />;
		return (<div>
			{button}
			{this.props.children}
		</div>);
	}

	showAdditional = () => {
		this.setState({showAdditional: true});
	}

	dontShowAdditional = () => {
		this.setState({showAdditional: false});
	}
}
