import React, { Component } from "react";
import { render } from "react-dom"
import LajiForm from "../src/components/LajiForm";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";

import "../src/styles";
import "./styles.css";

class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		let lang = "fi";
		this.state = {
			...schemas,
			//formData: undefined,
			onChange: this.onChange,
			apiClient: new ApiClientImplementation("https://apitest.laji.fi/v0", properties.accessToken, properties.userToken, lang),
			lang: lang
		}
	}

	onChange = (formData) => {
		this.setState(formData);
	}

	render () {
		return (
			<div className="container-fluid laji-form">
				<LajiForm {...this.state} />
			</div>
		);
	}
}

render((<LajiFormApp />), document.getElementById("app"));
