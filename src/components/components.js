import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import { Button as _Button, Overlay, OverlayTrigger as _OverlayTrigger, Popover, Tooltip, ButtonGroup, Glyphicon, Modal, Row, Col, FormControl, Panel, ListGroup, ListGroupItem } from "react-bootstrap";
import PanelHeading from "react-bootstrap/lib/PanelHeading";
import PanelCollapse from "react-bootstrap/lib/PanelCollapse";
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
			this._focusConfirm = true;
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

	setConfirmAutofocus = (elem) => {
		if (this._focusConfirm) {
			setImmediate(() => { // Without setImmediate focusing causes scroll to jump to top of page. Popover isn't positioned correctly probably right away.
				findDOMNode(elem).focus();
				this._focusConfirm = undefined;
			});
		}
	}

	render() {
		const {props, state} = this;
		const {show} = state;
		const {translations, corner, tooltip} = props;
		let buttonClassName = "glyph-button";
		buttonClassName += corner ? " delete-corner" : "";
		const getOverlayTarget = () => findDOMNode(this.refs.del);
		const onClick = e => this.onClick(e);
		const button = (
			<div className={props.className} style={this.props.style}>
				<Button id={`${props.id}-delete`}
				        bsStyle="danger"
								className={buttonClassName}
								ref="del"
								onKeyDown={this.onButtonKeyDown}
								onClick={onClick}>✖</Button>
				{show ?
					<Overlay show={true} placement="left" rootClose={true} onHide={this.onHideConfirm}
									 target={getOverlayTarget}>
						<Popover id={`${this.props.id}-delete-confirm`}>
							<span>{translations.ConfirmRemove}</span>
							<ButtonGroup>
								<Button bsStyle="danger" onClick={this.onConfirmedClick} ref={this.setConfirmAutofocus} id={`${props.id}-delete-confirm-yes`}>
									{translations.Remove}
								</Button>
								<Button bsStyle="default" onClick={this.onHideConfirm} id={`${this.props.id}-delete-confirm-no`}>
									{translations.Cancel}
								</Button>
							</ButtonGroup>
						</Popover>
					</Overlay>
					: null
				}
			</div>
		);
		return tooltip ? <TooltipComponent tooltip={tooltip}>{button}</TooltipComponent> : button;
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
		this.state = this.getState(props);
	}

	componentDidMount() {
		window.addEventListener("scroll", this.onScroll);
		window.addEventListener("resize", this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("resize", this.onResize);
	}

	componentDidUpdate(prevProps, prevState) {
		if (!this.props.onAffixChange || !prevState || !this.state) return;
		if (prevState.affixState !== AFFIXED && this.state.affixState === AFFIXED) {
			this.props.onAffixChange(true);
		} else if (prevState.affixState === AFFIXED && this.state.affixState !== AFFIXED) {
			this.props.onAffixChange(false);
		}
	}

	getState = (props) => {
		const container = props.getContainer();
		if (!container) return;

		const {topOffset = 0} = props;

		const containerTop = container.getBoundingClientRect().top;
		const containerHeight = container.offsetHeight;
		const containerVisibleHeight = containerHeight + containerTop;
		const wrapperHeight = findDOMNode(this.refs.wrapper).offsetHeight;
		const wrapperScrollHeight = findDOMNode(this.refs.wrapper).scrollHeight;
		const scrolled = containerTop < topOffset;

		let affixState = TOP;
		if (scrolled && containerVisibleHeight < wrapperScrollHeight + topOffset) affixState = BOTTOM;
		else if (scrolled) affixState = AFFIXED;

		const wrapperNode = findDOMNode(this.refs.wrapper);
		const width = wrapperNode ? wrapperNode.offsetWidth : undefined;
		const top = topOffset;

		const affixHeight = affixState === BOTTOM
			? Math.max(containerVisibleHeight - topOffset, 0)
			: undefined;

		const fixerHeight = affixState === AFFIXED
			? Math.max(
					Math.min(
						wrapperHeight + Math.min(containerTop, 0),
						wrapperHeight
					),
					0
				)
			: 0;
		return {affixState, width, top, affixHeight, fixerHeight};
	}

	_onScroll = () => {
		this.setState(this.getState(this.props));
	}

	onScroll = () => {
		requestAnimationFrame(this._onScroll);
	}
	
	_onResize = () => {
		const positioner = findDOMNode(this.refs.positioner);
		const width = positioner.getBoundingClientRect().width;

		const state = {width};

		const _state = this.getState(this.props);
		if (_state.affixState !== TOP) state.top = _state.top;

		this.setState(state);
	}

	onResize = () => {
		requestAnimationFrame(this._onResize);
	}

	render() {
		const {children, style: containerStyle} = this.props;
		const {top, width, affixState, affixHeight, fixerHeight} = this.state || {};
		const style = {};
		const fixerStyle = {position: "relative", zIndex: -1, height: fixerHeight};
		style.position = "relative";
		if (affixState === BOTTOM || affixState === AFFIXED) {
			style.position = "fixed";
			style.width = width;
			style.top = top;
			style.zIndex = 10000;
			style.height = affixHeight;
			if (affixState === BOTTOM) {
				style.overflow = "hidden";
			}
		}
		return (
			<div style={containerStyle}>
				<div ref="positioner" />
				<div ref="wrapper" style={style} className={this.props.className}>
					{children}
				</div>
				<div style={fixerStyle} />
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
			const state = this.getState();
			this.update(state);
			this.cameToViewFirstTime = state.affixHeight > this.props.enterViewPortTreshold || 0;
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
		let callback = undefined;
		const state = this.getState();
		if (!this.cameToViewFirstTime && state.affixHeight > this.props.enterViewPortTreshold || 0) {
			this.cameToViewFirstTime = true;
			if (this.props.onEnterViewPort) callback = () => this.props.onEnterViewPort();
		}
		this.update(state, callback);
	}

	onScroll = () => {
		requestAnimationFrame(this._onScroll);
	}

	_onResize = () => {
		const positioner = findDOMNode(this.refs.positioner);
		const width = positioner.getBoundingClientRect().width;

		let callback = undefined;
		const state = this.getState();
		if (!this.cameToViewFirstTime && state.affixHeight > this.props.enterViewPortTreshold || 0) {
			this.cameToViewFirstTime = true;
			if (this.props.onEnterViewPort) callback = () => this.props.onEnterViewPort();
		}
		this.update({...state, width}, callback);
	}

	onResize = () => {
		requestAnimationFrame(this._onResize);
	}

	update = (state, callback) => {
		const afterStateChange = () => {
			if (this.props.onResize) this.props.onResize();
			callback && callback();
		};
		state ? this.setState(state, () => {
			afterStateChange();
		}) : afterStateChange;
	}

	getState = () => {
		const {topOffset = 0, bottomOffset = 0, useAlignmentHeight = true} = this.props;

		const container = this.props.getContainer();
		let horizontallyAligned = true;
		const alignmentAnchor = this.props.getAlignmentAnchor ? this.props.getAlignmentAnchor() : undefined;
		const alignmentAnchorElem = alignmentAnchor ? findDOMNode(alignmentAnchor) : undefined;
		if (container) {
			if (alignmentAnchor &&
					container.getBoundingClientRect().top !== alignmentAnchorElem.getBoundingClientRect().top) {
				horizontallyAligned = false;
			}


			const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

			// These calculations are correct only when horizontally aligned.
			const containerTop = container.getBoundingClientRect().top;
			const containerBottom = container.getBoundingClientRect().bottom;
			const containerHeight = container.offsetHeight;
			const containerVisibleHeight = containerHeight - Math.abs(containerTop);
			const scrolled = containerTop < topOffset;
			const alignmentAnchorVisibleHeight = alignmentAnchorElem
				? alignmentAnchorElem.offsetHeight + alignmentAnchorElem.getBoundingClientRect().top
				: undefined;
			const alignmentAnchorScrolledBottom = alignmentAnchorElem
				? Math.min(viewportHeight - alignmentAnchorElem.getBoundingClientRect().bottom, 0)
				: undefined;

			let affixState = TOP;
			if (scrolled && containerVisibleHeight < (viewportHeight - bottomOffset)) affixState = BOTTOM;
			else if (scrolled) affixState = AFFIXED;

			const wrapperNode = findDOMNode(this.refs.wrapper);

			const width = wrapperNode ? wrapperNode.offsetWidth : undefined;

			let affixHeight, fixerHeight, top;
			if (horizontallyAligned) {
				top = topOffset;

				affixHeight = affixState !== BOTTOM
					? (!useAlignmentHeight
						? viewportHeight
						: alignmentAnchorVisibleHeight + alignmentAnchorScrolledBottom)
						- containerTop
						- Math.max(top - containerTop, 0)
						- bottomOffset
					: Math.max(
						(!useAlignmentHeight
							? (containerVisibleHeight
								- Math.max(bottomOffset - containerBottom, 0))
							: alignmentAnchorVisibleHeight
						)
						- topOffset
						,
						0
					);

				fixerHeight = affixState !== TOP
					? "100vh"
					: Math.max(viewportHeight - affixHeight, 0);
			} else {
				affixHeight = this.props.minHeight;
				fixerHeight = 0;
			}

			return {affixState, width, top, fixerHeight, affixHeight, horizontallyAligned};
		}
	}

	render() {
		const {children, useAlignmentHeight = true} = this.props;
		const {top, width, affixState, affixHeight, fixerHeight, horizontallyAligned} = this.state;

		const style = {position: "relative"};
		const fixerStyle = {position: "relative", zIndex: -1, height: fixerHeight};

		style.height = affixHeight;
		switch (affixState) {
		case TOP:
			break;
		case AFFIXED:
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
				<div style={useAlignmentHeight ? undefined : fixerStyle} />
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

export function Label({label, help, children, id, required, _context, helpHoverable}) {
	const showHelp = label && help;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>{help ? (
		<span>
			<strong>{label}</strong><br />
			<span dangerouslySetInnerHTML={{__html: help}} />
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
		<OverlayTrigger placement="right" overlay={tooltipElem} hoverable={helpHoverable} _context={_context}>
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
			<Panel collapsible="true" expanded={this.state.expanded} onToggle={this.collapseToggle}
				   className={classNames}>
				<PanelHeading>
					   <div className="laji-form-clickable-panel-header" onClick={this.collapseToggle}>
						   <div className="panel-title">
							   {title}
							   <span className="pull-right">
								   <GlyphButton glyph={this.state.expanded ? "chevron-up" : "chevron-down"} bsStyle="link" />
								   {showToggle ? <GlyphButton glyph="new-window" bsStyle="link" onClick={poppedToggle} /> : null}
							   </span>
						   </div>
					   </div>
				</PanelHeading>
				<PanelCollapse>
					<ListGroup>
						{errors.map(({label, error, id}, i) =>  {
							const _clickHandler = () => clickHandler(id);
							return (
								<ListGroupItem key={i} onClick={_clickHandler}>
									{label ? <b>{label}:</b> : null} {error}
								</ListGroupItem>
							);
						})}
					</ListGroup>
				</PanelCollapse>
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
			<_OverlayTrigger ref={this.setOverlayRef} placement={placement} trigger={trigger === "hover" ? [] : trigger} key={`${id}-overlay`} overlay={
				(tooltip) ? <Tooltip id={`${id}-tooltip`}>{tooltip}</Tooltip> : <NullTooltip />
			}>
				{children}
			</_OverlayTrigger>
		);

		return (trigger === "hover") ? (
			<div onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
				{overlay}
			</div>
		) : overlay;
	}
}

export class FetcherInput extends Component {
	setRef = (elem) => {
		if (this.props.getRef) this.props.getRef(elem);
	}

	render() {
		const {loading, validationState, glyph, getRef, extra, appendExtra, onMouseOver, onMouseOut, className = "", InputComponent, ...inputProps} = this.props; // eslint-disable-line no-unused-vars
		const Input = InputComponent ? InputComponent : FetcherInputDefaultInput;
		return (
			<div className={`fetcher-input ${extra ? " input-group" : ""} has-feedback${validationState ? ` has-${validationState}` : ""} ${className}`} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
				{extra}
				<Input {...inputProps} ref={this.setRef} />
				{glyph ? <FormControl.Feedback>{glyph}</FormControl.Feedback> : null}
				{loading ? <Spinner /> : null }
				{appendExtra}
			</div>
		);
	}
}

class FetcherInputDefaultInput extends Component {
	render() {
		return <input className="form-control" type="text" {...this.props} ref={this.ref} />;
	}
}

// Bootstrap OverlayTrigger that is hoverable if hoverable === true
export class OverlayTrigger extends Component {
	
	setOverlayTriggerRef = elem => {
		this.overlayTriggerRef = elem;
	};

	overlayTriggerMouseOver = () => {
		this.overlayTriggerMouseIn = true;
		this.overlayTriggerRef.show();
	};

	overlayTriggerMouseOut = () => {
		this.overlayTriggerMouseIn = false;
		if (this.overlayTimeout) {
			clearTimeout(this.overlayTimeout);
		}
		this.overlayTimeout = this.props._context.setTimeout(() => {
			if (!this.popoverMouseIn && !this.overlayTriggerMouseIn && this.overlayTriggerRef) this.overlayTriggerRef.hide();
		}, 200);
	};

	overlayMouseOver = () => {
		this.overlayMouseIn = true;
	}

	overlayMouseOut = () => {
		this.overlayMouseIn = false;
		if (this.overlayTimeout) {
			clearTimeout(this.overlayTimeout);
		}
		this.overlayTimeout = this.props._context.setTimeout(() => {
			if (!this.overlayMouseIn && !this.overlayTriggerMouseIn && this.overlayTriggerRef) this.overlayTriggerRef.hide();
		}, 200);
	}

	render() {
		const {
			children,
			overlay,
			_context, //eslint-disable-line no-unused-vars
			...props
		} = this.props;

		if (!this.props.hoverable) return (
			<_OverlayTrigger {...props} overlay={overlay}>
				{children}
			</_OverlayTrigger>
		);

		const _overlay = React.cloneElement(overlay, {onMouseOver: this.overlayMouseOver, onMouseOut: this.overlayMouseOut});

		return (
			<div onMouseOver={this.overlayTriggerMouseOver} onMouseOut={this.overlayTriggerMouseOut}>
				<_OverlayTrigger {...props}
				                delay={1}
				                trigger={[]} 
				                placement={this.props.placement || "top"}
												ref={this.setOverlayTriggerRef}
				                overlay={_overlay}>
					{children}
				</_OverlayTrigger>
			</div>
		);
	}
}
