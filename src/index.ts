import LajiForm, { LajiFormProps } from "./components/LajiForm";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";

type LajiFormWrapperProps = LajiFormProps & {rootElem: HTMLDivElement};

export default class LajiFormWrapper {
	props: LajiFormProps;
	state: LajiFormProps;
	rootElem: HTMLDivElement;
	lajiForm: LajiForm;

	constructor(props: LajiFormWrapperProps) {
		const {rootElem, ..._props} = props;
		this.props = props;
		this.rootElem = rootElem;
		this.lajiForm = render(
			React.createElement(LajiForm, _props, null),
			this.rootElem
		);
		this.state = {} as LajiFormProps;
	}

	submit = () => {
		this.lajiForm.submit();
	}

	submitOnlySchemaValidations = () => {
		this.lajiForm.submitOnlySchemaValidations();
	}

	setState = (state: Partial<LajiFormProps>) => {
		this.state = {...this.state, ...state};
		this.lajiForm = render(
			React.createElement(LajiForm, {...this.props, ...this.state}, null),
			this.rootElem
		);
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
		const {resize = {}} = this.lajiForm?.memoizedFormContext.services.customEvents.eventListeners || {};

		Object.keys(resize).sort().reverse().forEach(id => {
			this.lajiForm?.memoizedFormContext.services.customEvents.send(id, "resize", undefined, undefined, {bubble: false});
		});
	}
}
