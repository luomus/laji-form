import LajiForm from "./components/LajiForm";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";

class LajiFormApp extends React.Component {
	render() {
		return <LajiForm {...this.props} {...(this.state || {})} ref="lajiform"/>;
	}
}

export default class LajiFormWrapper {
	props: any;
	ref = React.createRef<LajiForm>();
	app = () => this.ref.current;
	rootElem: HTMLDivElement;

	constructor(props: any) {
		this.props = props;
		this.rootElem = props.rootElem;
		render(<LajiFormApp {...props} ref={this.ref} />, this.rootElem);
	}

	submit = () => {
		(this.app as any).refs?.lajiform.submit();
	}

	setState = (state: any) => {
		(this.app as any)?.setState(state);
	}

	pushBlockingLoader = () => {
		(this.app as any).refs.lajiform.pushBlockingLoader();
	}

	popBlockingLoader = () => {
		(this.app as any).refs.lajiform.popBlockingLoader();
	}

	getSettings = () => {
		return (this.app as any).refs.lajiform.getSettings();
	}

	destroy = () => {
		(this.app as any).refs.lajiform.destroy();
		unmountComponentAtNode(this.rootElem);
	}

	unmount = this.destroy

	invalidateSize = () => {
		const lajiForm = (this.app as any).refs.lajiform;
		const {resize} = lajiForm.customEventListeners;

		Object.keys(resize || {}).sort().reverse().forEach(id => {
			lajiForm._context.sendCustomEvent(id, "resize", undefined, undefined, {bubble: false});
		});
	}
}
