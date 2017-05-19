import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import { Button as _Button } from "react-bootstrap";
import { Overlay, OverlayTrigger, Popover, Tooltip, ButtonGroup, Glyphicon, Modal, Row, Col, FormControl } from "react-bootstrap";
import Spinner from "react-spinner";

export class Button extends Component {
	render() {
		return (
			<_Button
			bsStyle="primary"
			{...this.props}
			>{this.props.children}</_Button>
		);
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
		this.state = {show: false};
	}

	onButtonKeyDown({key}) {
		if (key === "Enter") this.onConfirmedClick();
		else if (key === "Escape") this.setState({show: false});
	}

	onHideConfirm() {
		this.setState({show: false});
	}

	onShowConfirm(e) {
		e.preventDefault();
		e.stopPropagation();
		this.setState({show: true}, () => {
			findDOMNode(this.refs["confirm-yes"]).focus();
		});
	}

	onConfirmedClick() {
		this.props.onClick();
		this.onHideConfirm();
	}

	onClick(e) {
		this.props.confirm ? this.onShowConfirm(e) : this.onConfirmedClick(e);
	}

	render() {
		const {props, state} = this;
		const {show} = state;
		const {translations, corner} = props;
		let buttonClassName = "glyph-button";
		buttonClassName += corner ? " delete-corner" : "";
		return (
			<div className={props.className} style={this.props.style}>
				<Button bsStyle="danger"
								className={buttonClassName}
								ref="del"
								onKeyDown={e => this.onButtonKeyDown(e)}
								onClick={e => this.onClick(e)}>✖</Button>
				{show ?
					<Overlay show={true} placement="left" rootClose={true} onHide={e => this.onHideConfirm(e)}
									 target={() => findDOMNode(this.refs.del)}>
						<Popover id="popover-trigger-click">
							<span>{translations.ConfirmRemove}</span>
							<ButtonGroup>
								<Button bsStyle="danger" onClick={e => this.onConfirmedClick(e)} ref="confirm-yes">
									{translations.Remove}
								</Button>
								<Button bsStyle="default" onClick={e => this.onHideConfirm(e)}>
									{translations.Cancel}
								</Button>
							</ButtonGroup>
						</Popover>
					</Overlay>
					: null
				}
			</div>
		);
	}
}

export function AddButton({onClick}) {
	return (<Row><Col xs={2}><Button onClick={onClick}>➕</Button></Col></Row>);
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
		<Button {...buttonProps} className={`glyph-button${props.className ? ` ${props.className}` : ""}`}>
			<Glyphicon glyph={glyph} />
		</Button>
	);
};

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
			const offset = (this.props.topOffset || 0);

			const containerTop = container.getBoundingClientRect().top;
			const containerHeight = container.offsetHeight;
			const containerVisibleHeight = containerHeight + containerTop;
			const wrapperHeight = findDOMNode(this.refs.wrapper).offsetHeight;
			const scrolled = containerTop < offset;

			let affixState = TOP;
			if (scrolled && containerVisibleHeight < wrapperHeight + offset) affixState = BOTTOM;
			else if (scrolled) affixState = AFFIXED;

			const wrapperNode = findDOMNode(this.refs.wrapper);
			const width = wrapperNode ? wrapperNode.offsetWidth : undefined;
			const top = affixState === BOTTOM ? (containerHeight - wrapperHeight) : offset;
			return {affixState, width, top};
		}
	}

	onScroll = () => {
		const state = this.getState();
		if (state && state.affixState !== this.state.affixState) {
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
		});
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


export class StretchAffix extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentWillReceiveProps(props) {
		if (props.mounted && !this.initialized) {
			this.update(this.getState());
			this.initialized = true;
		}
	}

	componentDidMount() {
		window.addEventListener("scroll", this.onScroll);
		window.addEventListener("resize", this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("resize", this.onResize);
	}

	onScroll = () => {
		requestAnimationFrame(() => {
			this.update(this.getState());
		});
	}

	onResize = () => {
		requestAnimationFrame(() => {
			const positioner = findDOMNode(this.refs.positioner);
			const width = positioner.getBoundingClientRect().width;

			this.update({...this.getState(), width});
		});
	}

	update = (state) => {
		const afterStateChange = () => {
			if (this.props.onResize) this.props.onResize();
		}
		state ? this.setState(state, () => {
			afterStateChange();
		}) : afterStateChange;
	}

	getState = () => {
		const container = this.props.getContainer();
		if (container) {
			const topOffset = this.props.topOffset || 0;
			const bottomOffset = this.props.bottomOffset || 0;

			const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

			const containerTop = container.getBoundingClientRect().top;
			const containerBottom = container.getBoundingClientRect().bottom;
			const containerHeight = container.offsetHeight;
			const containerVisibleHeight = containerHeight - Math.abs(containerTop);
			const scrolled = containerTop < topOffset;

			let affixState = TOP;
			if (scrolled && containerVisibleHeight < (viewportHeight - bottomOffset)) affixState = BOTTOM;
			else if (scrolled) affixState = AFFIXED;

			const wrapperNode = findDOMNode(this.refs.wrapper);

			const width = wrapperNode ? wrapperNode.offsetWidth : undefined;
			const top = topOffset;

			const affixHeight = affixState !== BOTTOM ?
				viewportHeight
					- containerTop
					- Math.max(top - containerTop, 0)
					- bottomOffset :
				Math.max(
					containerVisibleHeight
						- Math.max(bottomOffset - containerBottom, 0)
						- topOffset,
					0
				);
			const fixerHeight = affixState !== TOP ?
				"100vh" :
			Math.max(viewportHeight - affixHeight, 0);

			return {affixState, width, top, fixerHeight, affixHeight};
		}
	}

	render() {
		const {children} = this.props;
		const {top, width, affixState, affixHeight, fixerHeight} = this.state;

		const style = {position: "relative"};
		const fixerStyle = {position: "relative", zIndex: -1};

		style.height = affixHeight;
		fixerStyle.height = fixerHeight;
		switch (affixState) {
		case TOP:
			break;
		case AFFIXED:
			style.position = "fixed";
			style.width = width;
			style.top = top;
			break;
		case BOTTOM:
			style.position = "fixed";
			style.width = width;
			style.top = top;
			break;
		}

		return (
			<div>
				<div ref="positioner" />
				<div ref="wrapper" style={style} className={this.props.className}>
					{children}
				</div>
				<div style={fixerStyle} />
			</div>
		);
	}
}

export function Help({help, id}) {
	const helpGlyph = <span className="label-info laji-form-help-glyph"><strong>?</strong></span>;

	return help ? (
		<OverlayTrigger placement="right" overlay={<Tooltip id={id}>{help}</Tooltip> }>
			{helpGlyph}
		</OverlayTrigger>
	) : helpGlyph;
}

export function Label({label, help, children, id}) {
	const showHelp = label && help;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>{help ? (
		<span>
			<strong>{label}</strong><br />
			{help}
		</span>
	): label}</Tooltip>;

	const labelElem = (
		<label htmlFor={id}>
			<strong>{label}{showHelp ? <Help /> : null}</strong>
			{children}
		</label>
	);

	return (label || help) ? (
		<OverlayTrigger placement="right" overlay={tooltipElem}>
			{labelElem}
		</OverlayTrigger>
	) : labelElem;
}

function NullTooltip() {
	return <div />;
}

// Tooltip component that doesn't show tooltip for empty/undefined tooltip.
export function TooltipComponent({tooltip, children, id, placement, trigger}) {
	return (
		<OverlayTrigger placement={placement} trigger={trigger} key={`${id}-overlay`} overlay={
			(tooltip) ? <Tooltip id={`${id}-tooltip`}>{tooltip}</Tooltip> : <NullTooltip />
		}>
			{children}
		</OverlayTrigger>

	);
}

export function FetcherInput({loading, children, validationState, glyph, getRef, ...inputProps}) {
	return (
		<div className={`fetcher-input has-feedback${validationState ? ` has-${validationState}` : ""}`}>
			<input className="form-control" type="text" {...inputProps} ref={r => {if (getRef) getRef(r)}} />
			{glyph ?  <FormControl.Feedback>{glyph}</FormControl.Feedback> : null }
			{loading ? <Spinner /> : null }
		</div>
	);
}
