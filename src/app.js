import LajiForm from "./components/LajiForm";
import React, { Component } from "react";
import { render, unmountComponentAtNode } from "react-dom";

export default class LajiFormWrapper {
	constructor(props) {
		this.props = props;
		this.rootElem = props.rootElem;
		this.app = render(<LajiFormApp {...props} />, this.rootElem);
	}

	submit = () => {
		this.app.refs.lajiform.submit();
	}

	setState = (state) => {
		this.app && this.app.setState(state);
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

	invalidateSize = () => {
		const lajiForm = this.app.refs.lajiform;
		const {resize} = lajiForm.customEventListeners;

		Object.keys(resize || {}).sort().reverse().forEach(id => {
			lajiForm._context.sendCustomEvent(id, "resize", undefined, undefined, {bubble: false});
		});
	}
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
