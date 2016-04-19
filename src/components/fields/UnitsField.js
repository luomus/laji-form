import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import Button from "../Button";

export default class UnitsField extends Component {
	constructor(props) {
		super(props);
		this.state = {units: []};
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
		this.state.units.forEach((unit) => {
			unitRows.push(<Unit
				id={idx}
				key={idx}
				unit={unit}
				onChange={this.onUnitChange}
				schema={this.props.schema}
				uiSchema={this.props.uiSchema}
				idSchema={this.props.idSchema}
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
		schema: PropTypes.object.isRequired,
		uiSchema: PropTypes.object.isRequired,
		idSchema: PropTypes.object.isRequired,
		registry: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {showAdditional: false};
	}

	render() {
		return (
			<div className="unit-schema-container">
				<SchemaField
					schema={this.getSchema()}
					onChange={this.onChange}
					formData={this.props.unit}
					errorSchema={this.props.errorSchema}
					idSchema={this.props.idSchema}
					registry={this.props.registry}
					uiSchema={{classNames: "unit-schema"}}
				/>
				{this.renderButtons()}
			</div>);
	}

	renderButtons = () => {
		if (!this.props.unit.taxonName) return;

		let buttons = [<Button text="Lisää kuva" onClick={this.onAddClick} />];
		buttons.unshift(
			(this.state.showAdditional) ?
				<Button text="Näytä vähemmän muuttujia" onClick={this.dontShowAdditional} /> :
				<Button text="Näytä lisää muuttujia" onClick={this.showAdditional} />
		);
		return (<div className="unit-schema-buttons">
			{buttons}
		</div>);
	}

	getSchema = () => {
		let schema = this.props.schema;
		let uiSchema = this.props.uiSchema;
		let unit = this.props.unit;
		let fieldWrap = {fields: {taxonName: schema.items.properties.taxonName}, additionalFields: {}};
		let taxonNames = {};
		fieldWrap.fields.taxonName.enum.map((name) => { taxonNames[name] = true });
		if (unit.taxonName && taxonNames[unit.taxonName]) {
			Object.keys(fieldWrap).forEach((fieldKey) => {
				uiSchema["ui:options"][unit.taxonName][fieldKey].forEach((fieldName) => {
					fieldWrap[fieldKey][fieldName] = schema.items.properties[fieldName];
				});
			});
			fieldWrap.fields.taxonName = schema.items.properties.taxonName;
		}
		let fields = fieldWrap.fields;
		if (this.state.showAdditional) Object.keys(fieldWrap.additionalFields).forEach((field) => {
			fields[field] = fieldWrap.additionalFields[field];
		});
		return {type: "object", properties: fields}
	}

	onChange = (data) => {
		this.props.onChange(this.props.id, data);
	}

	showAdditional = () => {
		this.setState({showAdditional: true});
	}

	dontShowAdditional = () => {
		this.setState({showAdditional: false});
	}

	onAddImgClick = () => {

	}
}
