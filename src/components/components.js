import React, { Component, PropTypes } from "react";
import ReactDOM from "react-dom";
import { Button } from "react-bootstrap";
import { Overlay, Popover, ButtonGroup } from "react-bootstrap";

export default class LajiButton extends Component {
	static propTypes = {
		onClick: PropTypes.func.isRequired,
	}

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
			<Button
				{...this.props}
				{...buttonProps}>{this.props.children}</Button>);
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
				<LajiButton bsStyle="danger"
								className="col-xs-12 glyph-button"
								ref="del"
								onKeyDown={this.onButtonKeyDown}
								onClick={props.confirm ? this.onShowConfirm : this.onClick}>✖</LajiButton>
				{show ?
					<Overlay show={true} placement="left" rootClose={true} onHide={this.onHideConfirm}
									 target={() => ReactDOM.findDOMNode(this.refs.del)}>
						<Popover id="popover-trigger-click">
							<span>{translations.ConfirmRemove}</span>
							<ButtonGroup>
								<LajiButton bsStyle="danger" onClick={this.onClick}>
									{translations.Remove}
								</LajiButton>
								<LajiButton bsStyle="default" onClick={this.onHideConfirm}>
									{translations.Close}
								</LajiButton>
							</ButtonGroup>
						</Popover>
					</Overlay>
					: null
				}
			</div>
		)
	}
}

