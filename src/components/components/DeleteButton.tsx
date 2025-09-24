import * as React from "react";
import { findDOMNode } from "react-dom";
import ReactContext from "../../ReactContext";
import { Button, ButtonProps, TooltipComponent } from "../components";
import { FormContext } from "../LajiForm";


type Props = ButtonProps & {
	confirmStyle?: "browser";
	corner?: boolean;
	tooltip?: string;
	disabled?: boolean;
	readonly?: boolean;
	glyphButton?: boolean;
	confirm?: boolean;
	confirmPlacement?: string;
	onClick: () => void;
	style?: React.CSSProperties;
	translations: FormContext["translations"]
}

type State = {
	show?: boolean;
}

export class DeleteButton extends React.Component<Props, State> {
	static contextType = ReactContext;

	buttonRef = React.createRef<any>();

	constructor(props: Props) {
		super(props);
		this.state = {show: false};
	}

	onButtonKeyDown = ({key}: React.KeyboardEvent) => {
		if (key === "Enter") this.onConfirmedClick();
		else if (key === "Escape") this.setState({show: false});
	};

	onHideConfirm = () => {
		this.setState({show: false});
	};

	onShowConfirm = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		this.setState({show: true}, () => {
			if (this.props.confirmStyle === "browser") {
				this.browserConfirm();
			}
		});
	};

	onConfirmedClick = (e?: React.KeyboardEvent | React.MouseEvent) => {
		e && e.preventDefault();
		e && e.stopPropagation();
		this.props.onClick();
		this.onHideConfirm();
	};

	onClick = (e: React.MouseEvent) => {
		this.props.confirm ? this.onShowConfirm(e) : this.onConfirmedClick(e);
	};

	setConfirmAutofocus = (elem?: React.ReactInstance) => {
		setTimeout(() => { // Without setImmediate focusing causes scroll to jump to top of page. Popover isn't positioned correctly probably right away.
			(findDOMNode(elem) as HTMLElement)?.focus();
		});
	};

	render() {
		const {props} = this;
		const {corner, tooltip, disabled, readonly, glyphButton = true, confirm, confirmPlacement, confirmStyle, ...maybeProps} = props;  
		let buttonClassName = glyphButton ? "glyph-button" : "";
		buttonClassName += corner ? " button-corner" : "";
		if (props.className) {
			buttonClassName = `${buttonClassName} ${props.className}`;
		}
		if (props.id !== undefined) {
			(maybeProps as any).id = `${props.id}-delete`;
		}
		const button = <>
			<Button {...maybeProps}
			        disabled={disabled || readonly}
			        variant="danger"
			        className={buttonClassName}
			        style={this.props.style}
			        ref={this.buttonRef}
			        onKeyDown={this.onButtonKeyDown}
			        onClick={this.onClick}>{this.props.children} {"✖"}</Button>
			{this.renderConfirm()}
		</>;
		return tooltip ? <TooltipComponent tooltip={tooltip}>{button}</TooltipComponent> : button;
	}

	renderConfirm = () => {
		const {show} = this.state;
		if (!show) {
			return null;
		}
		const {confirmStyle = "popup"} = this.props;
		if (confirmStyle === "popup") {
			return this.renderConfirmPopup();
		}
		return null;
	};

	getOverlayTarget = () => findDOMNode(this.buttonRef.current);

	renderConfirmPopup() {
		const {translations, confirmPlacement = "left"} = this.props;
		const {Overlay, Popover, ButtonGroup} = this.context.theme;
		return (
			<Overlay show={true} placement={confirmPlacement} rootClose={true} onHide={this.onHideConfirm}
							 target={this.getOverlayTarget}>
				<Popover id={`${this.props.id}-button-confirm`}>
					<span>{translations.ConfirmRemove}</span>
					<ButtonGroup>
						<Button variant="danger" onClick={this.onConfirmedClick} ref={this.setConfirmAutofocus} id={`${this.props.id}-delete-confirm-yes`}>
							{translations.Remove}
						</Button>
						<Button variant="default" onClick={this.onHideConfirm} id={`${this.props.id}-delete-confirm-no`}>
							{translations.Cancel}
						</Button>
					</ButtonGroup>
				</Popover>
			</Overlay>
		);
	}

	browserConfirm() {
		const choice = confirm(this.props.translations.ConfirmRemove);
		if (choice) {
			this.onConfirmedClick();
		} else {
			this.onHideConfirm();
		}
	}
}

