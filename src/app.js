import React, { Component, PropTypes } from "react";

import Form from "react-jsonschema-form";
import api from "../src/api";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

import styles from  "./app.css";

const log = (type) => console.log.bind(console, type);

class Button extends Component {
	render() {
		return (<button type="button" className="btn btn-info"
		                tabIndex="-1" onClick={this.props.onClick}>{this.props.text}</button>);
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
					errorSchema={{}}
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
		if (unit.taxonName) {
			Object.keys(fieldWrap).forEach((fieldKey) => {
				uiSchema.options[unit.taxonName][fieldKey].forEach((fieldName) => {
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


class UnitsField extends Component {
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
				schema={this.props.schema}
				uiSchema={this.props.uiSchema}
				onChange={this.onUnitChange}
				idSchema={this.props.idSchema}
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

class ErrorBox extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="error-box">
				<span>ERROR{": " + this.props.errorMsg}</span>
			</div>
		)
	}
}

class FormSelect extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const title = this.props.title;
		return (
			<div>
				<h1>{title}</h1>
				<select defaultValue="" onChange={this.onChange}>
					<option value="" disabled hidden />
					{this.renderOptions()}
				</select>
			</div>
		);
	}

	renderOptions = () => {
		let options = [];
		let forms = this.props.forms;
		if (forms) Object.keys(forms).forEach((id) => {
			options.push(<option value={id}>{this.props.forms[id].name}</option>)
		});
		return options;
	}

	onChange = (e) => {
		if (typeof this.props.onChange === "function") this.props.onChange(this.props.forms[e.target.value]);
	}
}

export default class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			form: false,
			schema: {},
			uiSchema: {},
			formData: {},
			lastApiCallFailed: false,
			errorMsg: undefined
		};
	}

	componentDidMount() {
		api.getAllForms((response) => {
			let forms ={};
			response.forms.forEach(function(form) {
				forms[form.id] = form;
			});
			this.setState({forms: forms, form: true});
		});

		let schema = {
			"type": "object",
			"properties": {
				"gatherings": {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"dateBegin": {
								"type": "string",
								"title": "Alkupäivä"
							},
							"dateEnd": {
								"type": "string",
								"title": "Loppupäivä"
							},
							"leg": {
								"type": "array",
								"title": "Leg",
								"items": {
									"type": "string"
								}
							},
							"kartta": {
								"type": "string",
								"title": "[KARTTA] [ < edellinen ] [ seuraava >]"
							},
							"units": {
								"type": "array",
								"items": {
									"type": "object",
									"properties": {
										"taxonName": {"type": "string", "title": "Taksoni", "enum": ["MY.kantarelli", "MY.korvasieni", "MY.kalalokki"], "enumNames": ["kantarelli", "korvasieni", "kalalokki"]},
										"age": {"type": "string", "title": "Ikä"},
										"sex": {"type": "string", "title": "sukupuoli", "enum": ["MY.male", "MY.female"], "enumNames": ["koiras", "naaras"]},
										"notes": {"type": "string", "title": "Vapaat huomiot"},
										"count": {"type": "string", "title": "Lukumäärä"},
										"ring": {"type": "string", "title": "Rengas"}
									}
								}
							},
							"locality": {
								"type": "string",
								"title": "Paikannimet"
							},
							"localityDescription": {
								"type": "string",
								"title": "Paikan vapaamuotoinen kuvaus"
							},
							"habitatDescription": {
								"type": "string",
								"title": "Habitaatin kuvaus"
							},
							"biotype": {
								"type": "string",
								"enum": [
									"forest",
									"suo"
								],
								"enumNames": [
									"metsä",
									"suo"
								]
							},
							"biotypeSuo": {
								"type": "string",
								"enum": [
									"korpi",
									"räme",
									"neva"
								],
								"enumNames": [
									"korpi",
									"räme",
									"neva"
								]
							},
							"biotypeForest": {
								"type": "string",
								"enum": [
									"kuusi",
									"mänty",
									"lehto"
								],
								"enumNames": [
									"kuusi",
									"mänty",
									"lehto"
								]
							},
							"image": {
								"type": "string",
								"title": "Raahaa tähän kuvat tai valitse tiedosto koneeltasi [Browse]"
							},
							"rights": {
								"type": "string",
								"title": "Kuivien käyttöoikeus [pakollinen]"
							}
						},
						"required": [
							"leg"
						]
					}
				},
				"temp": {
					"type": "boolean"
				},
				"ready": {
					"type": "boolean"
				}
			},
			"required": []
		};
		let uiSchema = {
			gatherings: {
				items: {
					units: {
						"ui:field": "unit",
						"options": {
							"MY.kantarelli": {
								"url": "http://mock.api.luomus.fi/species/kantarelli",
								"fields": ["age", "count"],
								"additionalFields": ["notes"]
							},
							"MY.korvasieni": {
								"url": "http://mock.api.luomus.fi/species/kantarelli",
								"fields": ["age", "count"],
								"additionalFields": ["notes"]
							},
							"MY.kalalokki": {
								"url": "http://mock.api.luomus.fi/species/kantarelli",
								"fields": ["age", "count", "ring", "sex"],
								"additionalFields": ["notes"]
							}
						}
					}
				}
			}
		};
		this.setState({
			schema: schema,
			uiSchema: uiSchema,
			formData: {}
		});
	}

	onSelectedFormChange = (form) => {
		this.changeForm(form.id);
	}

	changeForm = (id) => {
		let that = this;
		api.getForm(id, function onSuccess(response) {
			that.setState({schema: response, lastApiCallFailed: false, errorMsg: undefined});
		}, function onError(response) {
			that.setState({schema: {}, lastApiCallFailed: true, errorMsg: response});
		});
	}

	onFormDataChange = ({formData}) => this.setState({formData});

//<div className="container-fluid">
//<div className="page-header">
//<FormSelect title="valitse lomake"
//forms={this.state.forms}
//onChange={this.onSelectedFormChange} />
//</div>
//<div className="col-sm-5">
//{this.state.lastApiCallFailed ?
//  <ErrorBox errorMsg={errorMsg} /> :
//  (!this.state.form ? null :
//    <Form
//      schema={schema}
//      uiSchema={uiSchema}
//      formData={formData}
//      onChange={this.onFormDataChange}
//      fields={{unit: UnitsField}}
//      onError={log("errors")} />)}
//</div>
//</div>
	render() {
		const {schema, uiSchema, formData, errorMsg} = this.state;
		return (
			<Form
				schema={schema}
				uiSchema={uiSchema}
				formData={formData}
				onChange={this.onFormDataChange}
				fields={{unit: UnitsField}}
				onError={log("errors")} />
		);
	}
}
