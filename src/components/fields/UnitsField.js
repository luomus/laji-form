import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import Button from "../Button";
import AdditionalsExpanderField from "./AdditionalsExpanderField";

export default class UnitsField extends Component {
	constructor(props) {
		super(props);
		this.state = {units: []};

		let units = this.props.formData || [];
		if (units.length > 0) {
			while (units.length % 10) {
				units.push({});
			}
		}
		this.state = {units: units};
	}

	onChange = (change) => {
		this.setState(change, () => {
			let dataOutput = [];
			if (this.state.units) this.state.units.forEach((unit) => {
				if (Object.keys(unit).length > 0) dataOutput.push(unit);
			});
			this.props.onChange(dataOutput);
		});
	}

	render() {
		return (
			<fieldset>
				<TitleField title={this.props.name}/>
				{this.renderUnits()}
				<Button text="Lisää havaintorivejä" onClick={this.onAddClick} /><br/>
				Pikasyötön lajiryhmä: <select onChange={this.onGroupChange}>{this.renderGroupSelect()}</select>
			</fieldset>
		)
	}

	renderGroupSelect = () => {
		//let options = [];
		//let groupObject = this.props.schema.items.properties.group;
		//for (let i = 0; i < groupObject.enum.length; i++) {
		//    options.push(<option value={groupObject.enum[i]}>{groupObject.enumNames[i]}</option>)
		//}
		//return options;
	}

	renderUnits = () => {
		let unitRows = [];
		let idx = 0;
		if (this.state.units) this.state.units.forEach((unit) => {
			unitRows.push(<Unit
				id={idx}
				key={idx}
				data={unit}
				onChange={this.onUnitChange}
				schema={this.props.schema.items}
				uiSchema={this.props.uiSchema}
				idSchema={{id: this.props.idSchema.id + "_" + idx}}
				errorSchema={this.props.errorSchema[idx]}
				registry={this.props.registry} />);
			idx++;
		});
		return unitRows;
	}

	onUnitChange = (idx, unit) => {
		let units = this.state.units;
		units[idx] = unit;
		this.onChange({units: units});
	}

	onGroupChange = (e) => {
		//if (typeof this.props.onChange === "function") this.props.onChange(this.props.forms[e.target.value]);
		//this.onChange({group: e.target.value});
	}

	onAddClick = () => {
		event.preventDefault();
		let units = this.state.units || [];
		for (var i = 0; i <  10; i++) {
			units.push({});
		}
		this.onChange({units: units});
	}
}

class Unit extends Component {
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
		return {
			schema: {type: "object", properties: fields},
			uiSchema: update(uiSchema.items, {$merge: {"ui:options": uiOptions}})
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
				<label>{this.props.name}</label>
				<select defaultValue="" className="form-control" onChange={this.props.onChange}>{options}</select>
			</fieldset>
		)
	}
}
