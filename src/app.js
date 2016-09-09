import LajiForm from "./components/LajiForm";
import React, { Component } from "react";
import { render, unmountComponentAtNode } from "react-dom"

export default class LajiFormWrapper {
	constructor(props) {
		this.rootElem = props.rootElem;
		this.app = render(<LajiFormApp {...props} />, this.rootElem);
	}

	setState(state) {
		this.app.setState(state);
	}

	unmount() {
		unmountComponentAtNode(this.rootElem);
	}
}

class LajiFormApp extends Component {

	constructor(props) {
		super(props);
		this.state = props;
	}

	render () {
		if (!this.state.schema) return null;
		return <LajiForm {...this.state} />;
	}
}