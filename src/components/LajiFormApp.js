import React, { Component, PropTypes } from "react";
import api from "../api";
import LajiForm from "./LajiForm";
import FormSelect from "./FormSelect";

export default class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		this.state = { formId: undefined };
	}
	componentDidMount() {
		api.getAllForms('fi', (response) => {
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

	render() {
		return (
			<div>
				<FormSelect title="valitse lomake"
				            forms={this.state.forms}
				            onChange={this.onSelectedFormChange} />
				<LajiForm formId={this.state.formId} lang="fi"/>
			</div>
		);
	}
}

