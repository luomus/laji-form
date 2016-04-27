import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import AdditionalsExpanderField from "./AdditionalsExpanderField";
import Button from "../Button";

/**
 * Unit's uiSchema can be defined in uiSchema:
 * uiSchema = {"ui:options": {
 *  innerUiSField: "string"
 * }
 */
export default class Unit extends Component {
	static propTypes = {
		data: PropTypes.object.isRequired,
		schema: PropTypes.object.isRequired,
		uiSchema: PropTypes.object.isRequired,
		idSchema: PropTypes.object.isRequired,
		registry: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {selectField: "taxonName"};
	}

	render() {
		const schemas = this.getSchemas();
		const schema = schemas.schema;
		let selectField = this.state.selectField;
		if (!this.props.data[selectField]) return (
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
				formData={this.props.data}
				errorSchema={this.props.errorSchema}
				idSchema={this.props.idSchema}
				registry={this.props.registry}
				uiSchema={schemas.uiSchema}
			>
				<Button text="Lisää kuva" onClick={this.onAddImgClick}/>
			</AdditionalsExpanderField>
		)
	}

	// Returns {schema: schema, uiSchema: uiSchema}
	getSchemas = () => {
		let schema = this.props.schema;
		let uiSchema = this.props.uiSchema;
		let unit = this.props.data;
		let fieldWrap = {fields: {taxonName: schema.properties.taxonName}, additionalFields: {}};
		let taxonNames = {};
		fieldWrap.fields.taxonName.enum.map((name) => { taxonNames[name] = true });
		if (unit.taxonName && taxonNames[unit.taxonName]) {
			Object.keys(fieldWrap).forEach((fieldKey) => {
				uiSchema["ui:options"][unit.taxonName][fieldKey].forEach((fieldName) => {
					fieldWrap[fieldKey][fieldName] = schema.properties[fieldName];
				});
			});
			fieldWrap.fields.taxonName = schema.properties.taxonName;
		}

		let fields = fieldWrap.fields;
		let uiOptions = {additionalFields: [], expanderButtonText: "Näytä lisää muuttujia", contractorButtonText: "Näytä vähemmän muuttujia"};
		Object.keys(fieldWrap.additionalFields).forEach((field) => {
			fields[field] = fieldWrap.additionalFields[field];
			uiOptions.additionalFields.push(field);
		});
		if (uiSchema["ui:options"] && uiSchema["ui:options"].innerUiField) uiOptions.innerUiField = uiSchema["ui:options"].innerUiField;
		return {
			schema: {type: "object", properties: fields},
			uiSchema: update(uiSchema, {$merge: {"ui:options": uiOptions}})
		}
	}

	onTaxonNameSelected = (e) => {
		this.props.onChange(this.props.id, getDefaultFormState(this.props.schema, {[this.state.selectField]: e.target.value}, this.props.schema.definitions));
	}

	onChange = (data) => {
		this.props.onChange(this.props.id, data);
	}


	onAddImgClick = () => {
		console.log("add click");
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
				<select defaultValue="" className="form-control taxon-select" onChange={this.props.onChange}>{options}</select>
			</fieldset>
		)
	}
}
