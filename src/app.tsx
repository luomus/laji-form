import LajiForm, { LajiFormProps } from "./components/LajiForm";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";

class LajiFormApp extends React.Component<LajiFormProps, LajiFormProps> {
	render() {
		return <LajiForm {...{...this.props, ...(this.state || {})} as LajiFormProps} ref="lajiform" />;
	}
}

export default class LajiFormWrapper {
	props: any;
	app: LajiFormApp;
	rootElem: HTMLDivElement;
	lajiForm: LajiForm;

	constructor(props: any) {
		this.props = props;
		this.rootElem = props.rootElem;
		this.app = render(<LajiFormApp {...props} />, this.rootElem) as unknown as LajiFormApp;
		this.lajiForm = this.app.refs.lajiform as unknown as LajiForm;
	}

	submit = () => {
		this.lajiForm.submit();
	}

	setState = (state: LajiFormProps) => {
		this.app?.setState(state);
	}

	pushBlockingLoader = () => {
		this.lajiForm.pushBlockingLoader();
	}

	popBlockingLoader = () => {
		this.lajiForm.popBlockingLoader();
	}

	getSettings = () => {
		return this.lajiForm.getSettings();
	}

	destroy = () => {
		this.lajiForm.destroy();
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
