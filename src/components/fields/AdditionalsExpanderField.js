import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import Button from "../Button";
import TableField from "./TableField";
import HorizontalSchemaField from "./HorizontalSchemaField";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Additionals to hide by default and shown on demand are defined in uiSchema:
 * uiSchema = {"ui:options": {
 *  "additionalFields: [fieldName1, ...]
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
				{this.renderUnit()}
				{this.renderButtons()}
			</div>);
	}

	renderUnit = () => {
		return (
			<SchemaField
				schema={this.getSchema()}
				onChange={this.props.onChange}
				formData={this.props.formData}
				errorSchema={this.props.errorSchema}
				idSchema={this.props.idSchema}
				registry={this.props.registry}
				uiSchema={this.props.uiSchema}
			/>
		)
	}

	getSchema = () => {
		const schema = this.props.schema;
		const uiSchema = this.props.uiSchema;
		if (this.state.showAdditional) return schema;
		else if (uiSchema && uiSchema["ui:options"] && uiSchema["ui:options"].additionalFields) {
			let dictionarifiedAdditionals = {};
			uiSchema["ui:options"].additionalFields.forEach((option) => {
				dictionarifiedAdditionals[option] = true;
			})
			let filteredSchema = {};
			Object.keys(schema.properties).forEach((prop) => {
				if (!dictionarifiedAdditionals[prop]) filteredSchema[prop] = schema.properties[prop];
			});
			return update(schema, {properties: {$set: filteredSchema}});
		}
	}

	renderButtons = () => {
		let expanderText = this.props.expanderButtonText || "Lisää";
		let contractorText = this.props.contractorButtonText || "Vähemmän";
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
