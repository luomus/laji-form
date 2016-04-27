import React from "react";
import { render } from "react-dom"
import LajiFormApp from "../src/app";
import properties from "../properties.json"

render((
	<div className="container">
		<LajiFormApp apiKey={properties.apiKey} />
	</div>),
	document.getElementById("app"));
