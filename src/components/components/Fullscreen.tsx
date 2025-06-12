import * as React from "react";
import { FormContext } from "../LajiForm";
import { createPortal } from "react-dom";

type Props = {
	formContext: FormContext;
	onKeyDown: React.KeyboardEventHandler;
}

export class Fullscreen extends React.Component<Props> {

	bodyOverFlow: string;
	_onKeyDown?: boolean;

	componentDidMount() {
		this.bodyOverFlow = document.body.style.overflow;

		if ((this.props as Props).onKeyDown) {
			this._onKeyDown = true;
			this.props.formContext.services.keyHandler.addGlobalEventHandler("keydown", this.props.onKeyDown);
		}
	}

	componentWillUnmount() {
		document.body.style.overflow = this.bodyOverFlow;
		if (this._onKeyDown) {
			this.props.formContext.services.keyHandler.removeGlobalEventHandler("keydown", this.props.onKeyDown);
		}
	}

	render() {
		return createPortal((
			<div className="laji-form fullscreen">
				{this.props.children}
			</div>
		), document.body);
	}
}
