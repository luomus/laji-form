import LajiForm from "./components/LajiForm";
import React, { Component } from "react";
import { render, unmountComponentAtNode } from "react-dom";

export default class LajiFormWrapper {
	constructor(props) {
		this.props = props;
		this.rootElem = props.rootElem;
		this.app = render(<LajiFormApp {...props} onChange={this.onChange} />, this.rootElem);
	}

	submit = () => {
		this.app.refs.lajiform.submit();
	}

	onChange = (formData) => {
		if (this.props.onChange) this.props.onChange(formData);
		this.setState({formData});
	}

	setState = (state) => {
		this.app.setState(state);
	}

	pushBlockingLoader = () => {
		this.app.refs.lajiform.pushBlockingLoader();
	}

	popBlockingLoader = () => {
		this.app.refs.lajiform.popBlockingLoader();
	}

	getSettings = () => {
		return this.app.refs.lajiform.getSettings();
	}

	destroy = () => {
		this.app.refs.lajiform.destroy();
		unmountComponentAtNode(this.rootElem);
	}

	unmount = this.destroy
}

class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		this.state = props;
	}

	render() {
		if (!this.state.schema) return null;
		return <LajiForm {...this.state} ref="lajiform"/>;
	}
}
