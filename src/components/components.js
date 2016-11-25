import React, { Component, PropTypes } from "react";
import { findDOMNode } from "react-dom";
import { Button as _Button } from "react-bootstrap";
import { Overlay, Popover, ButtonGroup, Glyphicon, Modal } from "react-bootstrap";

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
									 target={() => findDOMNode(this.refs.del)}>
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

const TOP = "TOP", AFFIXED = "AFFIXED", BOTTOM = "BOTTOM";
export class Affix extends Component {
	constructor(props) {
		super(props);
		this.state = {affixState: false};
	}

	componentDidMount() {
		window.addEventListener("scroll", this.onScroll);
		window.addEventListener("resize", this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("resize", this.onResize);
	}

	getState = () => {
		const container = this.props.getContainer();
		if (container) {
			const containerTop = container.getBoundingClientRect().top;
			const containerHeight = container.offsetHeight;
			const containerVisibleHeight = containerHeight + containerTop;
			const wrapperHeight = findDOMNode(this.refs.wrapper).offsetHeight;
			const scrolled = containerTop < 0;

			let affixState = TOP;
			if (scrolled && containerVisibleHeight < wrapperHeight) affixState = BOTTOM;
			else if (scrolled) affixState = AFFIXED;

			const wrapperNode = findDOMNode(this.refs.wrapper);
			const width = wrapperNode ? wrapperNode.offsetWidth : undefined;
			const top = affixState === BOTTOM ? (containerHeight - wrapperHeight) : 0;
			return {affixState, width, top}
		}
	}

	onScroll = () => {
		const state = this.getState();
		if (state.affixState !== this.state.affixState) {
			this.setState(state);
		}
	}

	onResize = () => {
		requestAnimationFrame(() => {
			const positioner = findDOMNode(this.refs.positioner);
			const width = positioner.getBoundingClientRect().width;

			const state = {width};

			const _state = this.getState();
			if (_state.affixState !== TOP) state.top = _state.top;

			this.setState(state);
		})
	}

	render() {
		const {children} = this.props;
		const {top, width, affixState} = this.state;
		const style = {};
		style.position = "relative";
		if (affixState === AFFIXED) {
			style.position = "fixed";
			style.width = width;
			style.top = top;
		}
		else if (affixState === BOTTOM) {
			style.top = top;
		}
		return (
			<div>
				<div ref="positioner" />
				<div ref="wrapper" style={style} className={this.props.className}>
					{children}
				</div>
			</div>
		);
	}
}
