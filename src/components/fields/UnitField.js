import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import AdditionalsExpanderField from "./AdditionalsExpanderField";
import Button from "../Button";

/**
 * Unit's uiSchema can be defined in uiSchema:
 * uiSchema = {"ui:options": {
 *  innerUiField: "string"
 * }
 */
export default class UnitField extends Component {
	static propTypes = {
		formData: PropTypes.object.isRequired,
		schema: PropTypes.object.isRequired,
		uiSchema: PropTypes.object.isRequired,
		idSchema: PropTypes.object.isRequired,
		registry: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldGroups)[0]}
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		let schemas = this.getSchemas(props);
		return {primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldGroups)[0], schema: schemas.schema, uiSchema: schemas.uiSchema};
	}

	render() {
		const schema = this.state.schema;
		let selectField = this.state.primaryfieldsSelector;
		if (!this.props.formData[selectField]) return (
			<NoninitializedSelect
				name={schema.title || selectField}
				schema={schema.properties[selectField]}
				onChange={this.onTaxonNameSelected}
			/>
		)
		else return (
			<AdditionalsExpanderField
				schema={schema}
				onChange={this.onChange}
				formData={this.props.formData}
				errorSchema={this.props.errorSchema}
				idSchema={this.props.idSchema}
				registry={this.props.registry}
				uiSchema={this.state.uiSchema}
			>
			</AdditionalsExpanderField>
		)
	}

	// Returns {schema: schema, uiSchema: uiSchema}
	getSchemas = (props) => {
		let schema = props.schema;
		let uiSchema = props.uiSchema;
		let formData = props.formData;

		let fieldsToShow = {};
		let additionalFields = [];

		function addFieldGroupFieldsToFields(fieldGroups) {
			if (!fieldGroups) return;
			Object.keys(fieldGroups).forEach((fieldSelector, i) => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValue = formData[fieldSelector];
				if (fieldSelectorValue) {
					let fieldGroup = fieldGroups[fieldSelector][fieldSelectorValue];
					fieldGroup.fields.forEach((fieldName) => {
						fieldsToShow[fieldName] = schema.properties[fieldName];
					})
					if (fieldGroup.fieldGroups) {
						addFieldGroupFieldsToFields(fieldGroup.fieldGroups)
					}
				}
			});
		}

		let fieldGroups = uiSchema["ui:options"].fieldGroups;
		addFieldGroupFieldsToFields(fieldGroups);
		let uiOptions = {expanderButtonText: "Näytä lisää muuttujia", contractorButtonText: "Näytä vähemmän muuttujia"};

		if (uiSchema["ui:options"] && uiSchema["ui:options"].innerUiField) uiOptions.innerUiField = uiSchema["ui:options"].innerUiField;

		return {
			schema: {type: "object", properties: fieldsToShow},
			uiSchema: update(uiSchema, {$merge: {"ui:options": uiOptions}})
		}
	}

	onTaxonNameSelected = (e) => {
		this.props.onChange(getDefaultFormState(this.props.schema, {[this.state.primaryfieldsSelector]: e.target.value}, this.props.schema.definitions));
	}

	onChange = (data) => {
		this.props.onChange(data);
	}
}

class NoninitializedSelect extends Component {
	render() {
		let options = (() => {
			const schema = this.props.schema;
			let options = [<option value="" key="-1" disabled hidden />];
			for (let i = 0; i < schema.enum.length; i++) {
				options.push(<option value={schema.enum[i]} key={i}>{schema.enumNames[i]}</option>)
			}
			return options;
		})();

		return (
			<fieldset>
				<label>{this.props.schema.title || this.props.name}</label>
				<select defaultValue="" className="form-control field-selector-select" onChange={this.props.onChange}>{options}</select>
			</fieldset>
		)
	}
}
