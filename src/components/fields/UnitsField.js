import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import Button from "../Button";
import UnitField from "./UnitField";

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
			unitRows.push(<SchemaField
				id={idx}
				key={idx}
				data={unit}
				onChange={this.onUnitChange}
				schema={this.props.schema.items}
				uiSchema={this.props.uiSchema.items}
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
