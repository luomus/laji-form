import React, { Component } from "react";
import { render } from "react-dom"
import LajiForm from "../src/components/LajiForm";
import FormSelect from "./FormSelect"
import properties from "../properties.json"
import Api from "../src/api";

class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		this.state = { formId: undefined };
		this.api = new Api(properties.apiKey);
	}

	componentDidMount() {
		this.api.getAllForms((response) => {
			let forms ={};
			response.forms.forEach(function(form) {
				forms[form.id] = form;
			});
			this.setState({forms: forms});
		});
	}

	onSelectedFormChange = (form) => {
		this.setState({formId: form.id});
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.formId !== this.props.formId) {
			this.changeForm(nextProps.formId);
		}
	}

	changeForm = (id) => {
		this.api.getForm(id, (response) => {
			this.setState({schema: response.schema, uiSchema: response.uiSchema, lastApiCallFailed: false, errorMsg: undefined});
		}, (response) => {
			this.setState({schema: undefined, uiSchema: undefined, lastApiCallFailed: true, errorMsg: response});
		});
	}

	onFormDataChange = ({formData}) => this.setState({formData});

	render () {
		const schema = this.state.schema || {};
		const uiSchema = this.state.uiSchema || {};
		return (
			<div className="container">
				<FormSelect title="valitse lomake"
				            forms={this.state.forms}
				            onChange={this.onSelectedFormChange} />
				<LajiForm schema={schema} uiSchema={uiSchema} />
			</div>
		);
	}
}

render((<LajiFormApp />), document.getElementById("app"));
