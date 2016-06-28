import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import { Row, Col } from "react-bootstrap";
import Button from "../Button";

/**
 * Additionals to hide by default and shown on demand are defined in uiSchema:
 * uiSchema = {ui:options: {
 *  additionalFields: [<string>]
 *  expanderButtonText: <string>
 *  contractorButtonText: <string>
 *  uiSchema: <uiSchema> (used for inner schema)
 * }
 *
 * Additional buttons are given as children.
 */
export default class AdditionalsExpanderField extends Component {
	constructor(props) {
		super(props);
		this.state = {showAdditional: undefined};
		this.state = {...this.state, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		let {schema, uiSchema} = props;

		let dictionarifiedAdditionals = {};

		if (uiSchema["ui:options"] && uiSchema["ui:options"].additionalFields && uiSchema["ui:options"].additionalFields.length) {
			uiSchema["ui:options"].additionalFields.forEach((option) => {
				dictionarifiedAdditionals[option] = true;
			});
			let showAdditional = this.shouldShowAdditionals(props, dictionarifiedAdditionals);
			if (!showAdditional && uiSchema && uiSchema["ui:options"] && uiSchema["ui:options"].additionalFields) {
				let filteredSchema = {};
				Object.keys(schema.properties).forEach((prop) => {
					if (!dictionarifiedAdditionals[prop]) filteredSchema[prop] = schema.properties[prop];
				});
				schema = update(schema, {properties: {$set: filteredSchema}, "ui:field": {$set: undefined}});
			}
		}

		uiSchema = (props.uiSchema && props.uiSchema["ui:options"] && props.uiSchema["ui:options"].uiSchema) ?
			props.uiSchema["ui:options"].uiSchema : {};

		return {schema, uiSchema, dictionarifiedAdditionals}
	}

	render() {
		let shouldShowButton = this.shouldShowAdditionalsButton(this.props);
		return (
			<Row className="expandable-field-container">
				<Col md={shouldShowButton ? 10 : 12}>
					{this.renderSchema()}
				</Col>
				{shouldShowButton ?
					<Col md={2}>
					{this.renderButton()}
					</Col> : null
				}
			</Row>);
	}

	renderSchema = () => {
		return (
			<SchemaField
				{...this.props}
				{...this.state}
			/>
		)
	}

	shouldShowAdditionals = (props, dictionarifiedAdditionals) => {
		if (this.state.showAdditional) return true;
		if (!dictionarifiedAdditionals) return false;

		let keys = Object.keys(dictionarifiedAdditionals);
		if (!keys.length) return false;

		if (props.formData) for (let property in props.formData) {
			if (props.formData[property] !== null && props.formData[property] !== undefined && dictionarifiedAdditionals[property]) return true;
		}
		return false;
	}

	shouldShowAdditionalsButton = (props) => {
		if (props.formData) for (let property in props.formData) {
			if (this.state.dictionarifiedAdditionals[property] && (props.formData[property] === undefined || props.formData[property] === null)) return true;
		}
		return false;
	}

	renderButton = () => {
		if (!this.props.uiSchema || !this.props.uiSchema["ui:options"] || !this.props.uiSchema["ui:options"].additionalFields || !this.props.uiSchema["ui:options"].additionalFields.length) return null;

		let expanderText = "Lisää";
		if (this.props.uiSchema && this.props.uiSchema["ui:options"] && this.props.uiSchema["ui:options"].expanderButtonText) expanderText = this.props.uiSchema["ui:options"].expanderButtonText;
		let contractorText = "Vähemmän";
		if (this.props.uiSchema && this.props.uiSchema["ui:options"] && this.props.uiSchema["ui:options"].contractorButtonText) contractorText = this.props.uiSchema["ui:options"].contractorButtonText;

		return this.shouldShowAdditionals(this.props, this.state.dictionarifiedAdditionals) ?
				<Button onClick={this.dontShowAdditional}>{contractorText}</Button> :
				<Button onClick={this.showAdditional}>{expanderText}</Button>;
	}

	showAdditional = () => {
		this.setState({showAdditional: true}, () => {this.componentWillReceiveProps(this.props)});
	}

	dontShowAdditional = () => {
		this.setState({showAdditional: false}, () => {this.componentWillReceiveProps(this.props)});
	}
}
