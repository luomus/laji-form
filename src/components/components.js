import React, { Component, PropTypes } from "react";
import ReactDOM from "react-dom";
import { Button as _Button } from "react-bootstrap";
import { Overlay, Popover, ButtonGroup, Glyphicon } from "react-bootstrap";

export class Button extends Component {
	render() {
		let buttonProps = {};
		buttonProps.bsStyle = "info";

		["disabled", "bsStyle", "onClick"].forEach(prop => {
			if (this.props.hasOwnProperty(prop)) buttonProps[prop] = this.props[prop];
		});

		buttonProps.bsClass = "btn";
		buttonProps.bsClass += ` btn-${buttonProps.bsStyle}`;
		if (this.props.className) buttonProps.bsClass += ` ${this.props.className}`;

		return (
			<_Button
				{...this.props}
				{...buttonProps}>{this.props.children}</_Button>);
	}
}

export class DeleteButton extends Component {
	static propTypes = {
		confirm: PropTypes.bool,
		onClick: PropTypes.func.isRequired,
		translations: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {show: false}
	}

	onButtonKeyDown = ({key}) => {
		if (key === "Enter") this.onClick();
		else if (key === "Escape") this.setState({show: false});
	}

	onHideConfirm = () => {
		this.setState({show: false});
	}

	onShowConfirm = (e) => {
		e.preventDefault();
		e.stopPropagation();
		this.setState({show: true});
	}

	onClick = () => {
		this.props.onClick();
		this.onHideConfirm();
	}

	render() {
		const {props, state} = this;
		const {show} = state;
		const {translations} = props;
		return (
			<div className={props.className}>
				<Button bsStyle="danger"
								className="col-xs-12 glyph-button"
								ref="del"
								onKeyDown={this.onButtonKeyDown}
								onClick={props.confirm ? this.onShowConfirm : this.onClick}>✖</Button>
				{show ?
					<Overlay show={true} placement="left" rootClose={true} onHide={this.onHideConfirm}
									 target={() => ReactDOM.findDOMNode(this.refs.del)}>
						<Popover id="popover-trigger-click">
							<span>{translations.ConfirmRemove}</span>
							<ButtonGroup>
								<Button bsStyle="danger" onClick={this.onClick}>
									{translations.Remove}
								</Button>
								<Button bsStyle="default" onClick={this.onHideConfirm}>
									{translations.Close}
								</Button>
							</ButtonGroup>
						</Popover>
					</Overlay>
					: null
				}
			</div>
		)
	}
}

export class Alert extends Component {
	render() {
		return (
			<Modal show={true} enforceFocus={true} onKeyDown={this.onKeyDown}>
				<Modal.Body>
					{this.props.children}
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={this.props.onOk}>Ok</Button>
				</Modal.Footer>
			</Modal>
		);
	}

	onKeyDown = (e) => {
		if (e.key === "Enter" || e.key === "Escape") this.props.onOk();
	}
}

export const GlyphButton = (props) => {
	const {glyph, ...buttonProps} = props;
	return (
		<Button {...buttonProps} className="glyph-button">
			<Glyphicon glyph={glyph} />
		</Button>
	);
}
