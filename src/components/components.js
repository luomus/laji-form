import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import { Button as _Button, Overlay, OverlayTrigger, Popover, Tooltip, ButtonGroup, Glyphicon, Modal, Row, Col, FormControl, Panel, ListGroup, ListGroupItem } from "react-bootstrap";
import Spinner from "react-spinner";

export class Button extends Component {
	render() {
		const {
			tooltip,
			tooltipPlacement,
			tooltipTrigger,
			..._props
		} = this.props;
		return (
			<TooltipComponent tooltip={tooltip} placement={tooltipPlacement} trigger={tooltipTrigger}>
				<_Button
				bsStyle="primary"
				{..._props}
				>{_props.children}</_Button>
			</TooltipComponent>
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

	onButtonKeyDown = ({key}) => {
		if (key === "Enter") this.onConfirmedClick();
		else if (key === "Escape") this.setState({show: false});
	}

	onHideConfirm = () => {
		this.setState({show: false}, () => {
			if (this.callback) {
				this.callback(this.deleted);
				this.callbackCalled = true;
			}
		});
	}

	onShowConfirm = (e) => {
		e.preventDefault();
		e.stopPropagation();
		this.setState({show: true}, () => {
			findDOMNode(this.refs["confirm-yes"]).focus();
		});
	}

	onConfirmedClick = () => {
		this.props.onClick();
		this.onHideConfirm();
		this.deleted = true;
	}

	onClick = (e, callback) => {
		this.callback = callback;
		this.props.confirm ? this.onShowConfirm(e) : this.onConfirmedClick();
	}

	componentWillUnmount = () => {
		if (this.callback && !this.callbackCalled) {
			this.callback(this.deleted);
		}
	}

	render() {
		const {props, state} = this;
		const {show} = state;
		const {translations, corner} = props;
		let buttonClassName = "glyph-button";
		buttonClassName += corner ? " delete-corner" : "";
		const getOverlayTarget = () => findDOMNode(this.refs.del);
		const onClick = e => this.onClick(e);
		return (
			<div className={props.className} style={this.props.style}>
				<Button bsStyle="danger"
								className={buttonClassName}
								ref="del"
								onKeyDown={this.onButtonKeyDown}
								onClick={onClick}>✖</Button>
				{show ?
					<Overlay show={true} placement="left" rootClose={true} onHide={this.onHideConfirm}
									 target={getOverlayTarget}>
						<Popover id="popover-trigger-click">
							<span>{translations.ConfirmRemove}</span>
							<ButtonGroup>
								<Button bsStyle="danger" onClick={this.onConfirmedClick} ref="confirm-yes">
									{translations.Remove}
								</Button>
								<Button bsStyle="default" onClick={this.onHideConfirm}>
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
		<Button {...buttonProps} 
		        className={`glyph-button${props.className ? ` ${props.className}` : ""}`} 
			      tooltipPlacement={props.tooltipPlacement || "left"}>
			<Glyphicon glyph={glyph} />
			{props.children}
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

	_onScroll = () => {
		const state = this.getState();
		if (state && state.affixState !== this.state.affixState) {
			this.setState(state);
		}
	}

	onScroll = () => {
		requestAnimationFrame(this._onScroll);
	}
	
	_onResize = () => {
		const positioner = findDOMNode(this.refs.positioner);
		const width = positioner.getBoundingClientRect().width;

		const state = {width};

		const _state = this.getState();
		if (_state.affixState !== TOP) state.top = _state.top;

		this.setState(state);
	}

	onResize = () => {
		requestAnimationFrame(this._onResize);
	}

	render() {
		const {children, style: containerStyle} = this.props;
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
			<div style={containerStyle}>
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

	_onScroll = () => {
		this.update(this.getState());
	}

	onScroll = () => {
		requestAnimationFrame(this._onScroll);
	}

	_onResize = () => {
		const positioner = findDOMNode(this.refs.positioner);
		const width = positioner.getBoundingClientRect().width;

		this.update({...this.getState(), width});
	}

	onResize = () => {
		requestAnimationFrame(this._onResize);
	}

	update = (state) => {
		const afterStateChange = () => {
			if (this.props.onResize) this.props.onResize();
		};
		state ? this.setState(state, () => {
			afterStateChange();
		}) : afterStateChange;
	}

	getState = () => {
		const container = this.props.getContainer();
		let horizontallyAligned = true;
		const aligmentAnchor = this.props.getAligmentAnchor ? this.props.getAligmentAnchor() : undefined;
		if (container) {
			if (aligmentAnchor &&
					container.getBoundingClientRect().top !== findDOMNode(aligmentAnchor).getBoundingClientRect().top) {
				horizontallyAligned = false;
			}

			const topOffset = this.props.topOffset || 0;
			const bottomOffset = this.props.bottomOffset || 0;

			const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

			// These calculations are correct only when horizontally aligned.
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

			let affixHeight, fixerHeight, top;
			if (horizontallyAligned) {
				top = topOffset;

				affixHeight = affixState !== BOTTOM ?
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

				fixerHeight = affixState !== TOP ?
					"100vh" :
				Math.max(viewportHeight - affixHeight, 0);
			} else {
				affixHeight = this.props.minHeight;
				fixerHeight = 0;
			}

			return {affixState, width, top, fixerHeight, affixHeight, horizontallyAligned};
		}
	}

	render() {
		const {children} = this.props;
		const {top, width, affixState, affixHeight, fixerHeight, horizontallyAligned} = this.state;

		const style = {position: "relative"};
		const fixerStyle = {position: "relative", zIndex: -1, height: fixerHeight};

		style.height = affixHeight;
		switch (affixState) {
		case TOP:
			break;
		case AFFIXED:
			if (horizontallyAligned) style.position = "fixed";
			style.width = width;
			style.top = top;
			break;
		case BOTTOM:
			if (horizontallyAligned) style.position = "fixed";
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

export class Stretch extends Component {
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
	}

	onScroll = () => {
		requestAnimationFrame(this.update);
	}

	update = () => {
		const state = this.getState();
		const afterStateChange = () => {
			if (this.props.onResize) this.props.onResize();
		};
		state ? this.setState(state, () => {
			afterStateChange();
		}) : afterStateChange;
	}

	getState = () => {
		const {getContainer, topOffset = 0, bottomOffset = 0, minHeight} = this.props;
		let container = getContainer();

		if (this.refs.wrapper &&
		    this.props.getContainer().getBoundingClientRect().top !== findDOMNode(this.refs.wrapper).getBoundingClientRect().top) {
			return {
				horizontallyAligned: false
			};
		}

		let containerHeight = container.offsetHeight;
		if (minHeight && containerHeight < minHeight) {
			containerHeight = minHeight;
			container = this.refs.wrapper;
		}

		const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		const bottomDist = viewportHeight - container.getBoundingClientRect().top - containerHeight;
		const bottomInvisibleHeight = Math.min(bottomDist, 0);

		return {
			horizontallyAligned: true,
			containerHeight,
			height: Math.max(
					containerHeight
					+ Math.min(container.getBoundingClientRect().top, 0)
					+ Math.min(bottomInvisibleHeight, 0)
					- (container.getBoundingClientRect().top < topOffset ? Math.min(topOffset - container.getBoundingClientRect().top, topOffset) : 0)
					- (bottomDist < bottomOffset ? Math.min(bottomOffset - bottomDist, bottomOffset) : 0),
				0),
			top: Math.max(-container.getBoundingClientRect().top + topOffset, 0)
		};
	}

	render() {
		const {children} = this.props;

		const wrapperStyle = {
			height: this.state.horizontallyAligned ? this.state.containerHeight : this.props.minHeight,
		};
		const style = {
			position: "relative",
			top: this.state.horizontallyAligned ? this.state.top : undefined,
			height: this.state.horizontallyAligned ? this.state.height : "100%",
		};

		return (
			<div ref="wrapper" style={wrapperStyle} className={this.props.className}>
				<div style={style}>
					{children}
				</div>
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

export function Label({label, help, children, id, required}) {
	const showHelp = label && help;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>{help ? (
		<span>
			<strong>{label}</strong><br />
			{help}
		</span>
	): label}</Tooltip>;

	const labelElem = (
		<label htmlFor={id}>
			<div>
				<strong>{label}{required ? "*" :  ""}</strong>
                {showHelp ? <Help /> : null}
			</div>
			{children}
		</label>
	);

	return (label || help) ? (
		<OverlayTrigger placement="right" overlay={tooltipElem}>
			{labelElem}
		</OverlayTrigger>
	) : labelElem;
}

export class ErrorPanel extends Component {
	constructor(props) {
		super(props);
		this.state = {expanded: true};
	}

	expand = () => {
		if (!this.state.expanded) this.setState({expanded: true});
	};
	collapseToggle = () => this.setState({expanded: !this.state.expanded});

	render() {
		const {errors, title, clickHandler, poppedToggle, showToggle, classNames} = this.props;

		if (errors.length === 0) return null;

		return (
			<Panel collapsible expanded={this.state.expanded}
				   className={classNames}
				   header={
					   <div className="laji-form-clickable-panel-header" onClick={this.collapseToggle}>
						   <div className="panel-title">
							   {title}
							   <span className="pull-right">
								   <GlyphButton glyph={this.state.expanded ? "chevron-up" : "chevron-down"} bsStyle="link" />
								   {showToggle ? <GlyphButton glyph="new-window" bsStyle="link" onClick={poppedToggle} /> : null}
							   </span>
						   </div>
					   </div>
				   }
			>
				<ListGroup fill>
					{errors.map(({label, error, id}, i) =>  {
						const _clickHandler = () => clickHandler(id);
						return (
							<ListGroupItem key={i} onClick={_clickHandler}>
								{label ? <b>{label}:</b> : null} {error}
							</ListGroupItem>
						);
					})}
				</ListGroup>
			</Panel>
		);
	}
}

function NullTooltip() {
	return <div />;
}

// Tooltip component that doesn't show tooltip for empty/undefined tooltip.
export class TooltipComponent extends Component {
	setOverlayRef = (elem) => {
		this.overlayElem = elem;
	}
	onMouseOver = () => this.overlayElem.show();
	onMouseOut = () => this.overlayElem.hide();

	render() {
		const {tooltip, children, id, placement, trigger} = this.props;

		const overlay = (
			<OverlayTrigger ref={this.setOverlayRef} placement={placement} trigger={trigger === "hover" ? [] : trigger} key={`${id}-overlay`} overlay={
				(tooltip) ? <Tooltip id={`${id}-tooltip`}>{tooltip}</Tooltip> : <NullTooltip />
			}>
				{children}
			</OverlayTrigger>
		);

		return (trigger === "hover") ? (
			<div onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
				{overlay}
			</div>
		) : overlay;
	}
}

export class FetcherInput extends Component{
	setRef = (elem) => {
		if (this.props.getRef) this.props.getRef(elem);
	}

	render() {
		const {loading, validationState, glyph, getRef, extra, appendExtra, onMouseOver, onMouseOut, className = "", ...inputProps} = this.props; // eslint-disable-line no-unused-vars
		return (
			<div className={`fetcher-input ${extra ? " input-group" : ""} has-feedback${validationState ? ` has-${validationState}` : ""} ${className}`} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
				{extra}
				<input className="form-control" type="text" {...inputProps} ref={this.setRef} />
				{glyph ? <FormControl.Feedback>{glyph}</FormControl.Feedback> : null}
				{loading ? <Spinner /> : null }
				{appendExtra}
			</div>
		);
	}
}
