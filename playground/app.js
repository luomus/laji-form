import React, { Component } from "react";
import { render } from "react-dom"
import LajiForm from "../src/components/LajiForm";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";

import "../src/styles";

class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		this.state = {
			...schemas,
			 // formData: undefined,
			onChange: this.onChange,
			apiClient: new ApiClientImplementation("https://apitest.laji.fi/v0", properties.accessToken, properties.userToken)
		}
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
