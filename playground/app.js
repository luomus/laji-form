import React, { Component } from "react";
import { render } from "react-dom"
import LajiForm from "../src/components/LajiForm";
import schemas from "./schemas.json";

class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		this.state = {schema: schemas.schema, uiSchema: schemas.uiSchema, onChange: this.onChange, formData: schemas.formData}
		//this.state = {schema: schemas.schema, uiSchema: schemas.uiSchema, onChange: this.onChange};
	}
	
	onChange = (formData) => {
		this.setState(formData);
	}

	render () {
		return (
			<div className="container">
				<LajiForm {...this.state} />
			</div>
		);
	}
}

render((<LajiFormApp />), document.getElementById("app"));
