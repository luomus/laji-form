import React, { Component } from "react";
import { render } from "react-dom"
import LajiForm from "../src/components/LajiForm";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";

import "../src/styles";
import "./styles.css";

const USE_LOCAL_SCHEMAS = false;

class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		let lang = "fi";
		this.state = {
			...schemas,
			formData: {gatheringEvent: {leg: [properties.userToken]}, editors: [properties.userToken]},
			onChange: this.onChange,
			onSubmit: this.onSubmit,
			apiClient: new ApiClientImplementation("https://apitest.laji.fi/v0", properties.accessToken, properties.userToken, lang),
			lang: lang
		}
	}

	componentDidMount() {
		if (USE_LOCAL_SCHEMAS) return;
		this.state.apiClient.fetch("/forms/JX.519", {lang: this.state.lang}).then(result => {
			const {schema, uiSchema} = result;
			this.setState({schema, uiSchema});
		}).catch(() => {
			console.log("Form request failed - using local schemas.");
		});
	}

	onSubmit = ({formData}) => {
		console.log(formData)
	}

	onChange = (formData) => {
		this.setState({formData: formData});
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
