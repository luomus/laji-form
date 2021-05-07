import * as React from "react";
import * as PropTypes from "prop-types";
import { findDOMNode, createPortal } from "react-dom";
import * as Spinner from "react-spinner";
import { schemaJSONPointer, uiSchemaJSONPointer, parseJSONPointer, getJSONPointerFromLajiFormIdAndRelativePointer, JSONPointerToId, classNames } from "../utils";
import Context from "../Context";
import ReactContext from "../ReactContext";

export class Button extends React.Component {
	static contextType = ReactContext;
	render() {
		const {
			tooltip,
			tooltipPlacement,
			tooltipTrigger,
			tooltipClass,
			..._props
		} = this.props;
		const {Button: _Button} = this.context.theme;
		return (
			<TooltipComponent tooltip={tooltip} placement={tooltipPlacement} trigger={tooltipTrigger} className={tooltipClass}>
				<_Button
					{..._props}
				>{_props.children}</_Button>
			</TooltipComponent>
		);
	}
}

export class DeleteButton extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		confirm: PropTypes.bool,
		onClick: PropTypes.func.isRequired,
		translations: PropTypes.object.isRequired,
		confirmStyle: PropTypes.oneOf(["popup", "browser"])
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
			if (this.props.confirmStyle === "browser") {
				this.browserConfirm();
			}
		});
	}

	onConfirmedClick = (e) => {
		e && e.preventDefault();
		e && e.stopPropagation();
		this.props.onClick();
		this.onHideConfirm();
		this.deleted = true;
	}

	onClick = (e, callback) => {
		this.callback = callback;
		this.props.confirm ? this.onShowConfirm(e) : this.onConfirmedClick(e);
	}

	componentWillUnmount = () => {
		if (this.callback && !this.callbackCalled) {
			this.callback(this.deleted);
		}
	}

	setConfirmAutofocus = (elem) => {
		if (this._focusConfirm) {
			setTimeout(() => { // Without setImmediate focusing causes scroll to jump to top of page. Popover isn't positioned correctly probably right away.
				
				const domElem = findDOMNode(elem);
				domElem && domElem.focus();
				this._focusConfirm = undefined;
			});
		}
	}

	render() {
		const {props} = this;
		const {corner, tooltip, disabled, readonly, glyphButton = true, confirm, onClick, confirmPlacement, confirmStyle, ...maybeProps} = props; // eslint-disable-line @typescript-eslint/no-unused-vars
		let buttonClassName = glyphButton ? "glyph-button" : "";
		buttonClassName += corner ? " button-corner" : "";
		if (props.className) {
			buttonClassName = `${buttonClassName} ${props.className}`;
		}
		if (props.id !== undefined) {
			maybeProps.id = `${props.id}-delete`;
		}
		const button = (
			<React.Fragment>
				<Button {...maybeProps}
				        disabled={disabled || readonly}
				        variant="danger"
				        className={buttonClassName}
				        style={this.props.style}
				        ref="del"
				        onKeyDown={this.onButtonKeyDown}
				        onClick={this.onClick}>{this.props.children} {"✖"}</Button>
				{this.renderConfirm()}
			</React.Fragment>
		);
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
	}

	getOverlayTarget = () => findDOMNode(this.refs.del);

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

export function AddButton({onClick}) {
	const {Row, Col} = React.useContext(ReactContext).theme;
	return  <Row><Col xs={2}><Button onClick={onClick}>➕</Button></Col></Row>;
}

export const GlyphButton = React.forwardRef((props, ref) => {
	const {glyph, ...buttonProps} = props;
	const {Glyphicon} = React.useContext(ReactContext).theme;
	return (
		<Button {...buttonProps} 
		        ref={ref}
		        className={`glyph-button${props.className ? ` ${props.className}` : ""}`} 
		        tooltipPlacement={props.tooltipPlacement || "left"}>
			<Glyphicon glyph={glyph} />
			{props.children}
		</Button>
	);
});

const TOP = "TOP", AFFIXED = "AFFIXED", BOTTOM = "BOTTOM";
export class Affix extends React.Component {
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
		const {topOffset = 0, bottomOffset = 0, getContainer} = props;

		const container = getContainer ? getContainer() : this.refs.container;
		const wrapperElem = findDOMNode(this.refs.wrapper);
		if (!container || !document.body.contains(container) || !wrapperElem) return;

		const containerTop = container.getBoundingClientRect().top;
		const containerHeight = container.offsetHeight;
		const containerVisibleHeight = containerHeight + containerTop;
		const wrapperHeight = wrapperElem.offsetHeight;
		const wrapperScrollHeight = wrapperElem.scrollHeight;
		const scrolled = this.refs.container.getBoundingClientRect().top < topOffset;

		const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		const bottomDist = viewportHeight - container.getBoundingClientRect().top - containerHeight;
		const bottomInvisibleHeight = Math.min(bottomDist, 0);

		let affixState = TOP;
		if (scrolled && containerVisibleHeight < wrapperScrollHeight + topOffset) affixState = BOTTOM;
		else if (scrolled) affixState = AFFIXED;

		const width = wrapperElem ? wrapperElem.offsetWidth : undefined;
		const top = topOffset;

		const affixHeight = affixState === BOTTOM
			? Math.max(
				containerVisibleHeight
					- topOffset
					+ Math.min(bottomInvisibleHeight, 0)
					- (bottomDist < bottomOffset ? Math.min(bottomOffset - bottomDist, bottomOffset) : 0),
				0)
			: undefined;
		const wrapperCutHeight = wrapperHeight - (affixHeight || 0);

		let change;
		if (affixState === BOTTOM) {
			if (!this.state) {
				change = wrapperCutHeight;
			} else {
				if (this.state.affixState === BOTTOM) {
					const lastChange = this.state.change;
					const changeNow = wrapperCutHeight;
					change = lastChange + changeNow;
				} else {
					change = wrapperCutHeight;
				}
			}
		}

		const fixerHeight = affixState === AFFIXED
			? wrapperHeight - (affixHeight || 0)
			: affixState === BOTTOM
				? affixHeight + change
				: 0;
		return {affixState, width, top, affixHeight, fixerHeight, change};
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
			style.zIndex = 1000;
			style.height = affixHeight;
			if (affixState === BOTTOM) {
				style.overflow = "hidden";
			}
		}
		return (
			<div style={containerStyle} ref="container">
				<div ref="positioner" />
				<div ref="wrapper" style={style} className={this.props.className}>
					{children}
				</div>
				<div style={fixerStyle} />
			</div>
		);
	}
}

export class Stretch extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	UNSAFE_componentWillReceiveProps(props) {
		if (props.mounted && !this.initialized) {
			const state = this.getState();
			this.update(state);
			this.cameToViewFirstTime = state.height > this.props.enterViewPortTreshold || 0;
			this.initialized = true;
		}
	}

	componentDidMount() {
		window.addEventListener("scroll", this.onScroll);
		window.addEventListener("resize", this.onScroll);
	}

	componentWillUnmount() {
		window.removeEventListener("scroll", this.onScroll);
		window.removeEventListener("resize", this.onScroll);
	}

	_onScroll = () => {
		let callback = undefined;
		const state = this.getState();
		if (!this.cameToViewFirstTime && state.height > this.props.enterViewPortTreshold || 0) {
			this.cameToViewFirstTime = true;
			if (this.props.onEnterViewPort) callback = () => this.props.onEnterViewPort();
		}
		this.update(state, callback);
	}

	onScroll = () => {
		requestAnimationFrame(this._onScroll);
	}

	invalidate = (callback) => {
		this.update(this.getState(), callback);
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
	const helpGlyph = <span className="label-info laji-form-help-glyph">?</span>;
	const {Tooltip} = React.useContext(ReactContext).theme;

	return help ? (
		<OverlayTrigger placement="right" overlay={<Tooltip id={id}><span dangerouslySetInnerHTML={{__html: help}} /></Tooltip> }>
			{helpGlyph}
		</OverlayTrigger>
	) : helpGlyph;
}

export function Label({label, help, children, id, required, _context, helpHoverable, helpPlacement}) {
	const showHelp = label && help;
	const {Tooltip, OverlayTrigger} = React.useContext(ReactContext).theme;

	const tooltipElem = (
		<Tooltip id={id + "-tooltip"}>{help ? (
			<span>
				<strong dangerouslySetInnerHTML={{__html: label}} /><br />
				<span dangerouslySetInnerHTML={{__html: help}} />
			</span>
		): label}</Tooltip>
	);

	const labelElem = (
		<label htmlFor={id}>
			<div>
				<strong dangerouslySetInnerHTML={{__html: label + (required ? "*" :  "")}} />
				{showHelp ? <Help /> : null}
			</div>
			{children}
		</label>
	);

	return (label || help) ? (
		<OverlayTrigger placement={helpPlacement || "right"} overlay={tooltipElem} hoverable={helpHoverable} _context={_context}>
			{labelElem}
		</OverlayTrigger>
	) : labelElem;
}

export class ErrorPanel extends React.Component {
	static contextType = ReactContext;

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

		const {Panel, ListGroup} = this.context.theme;

		return (
			<Panel collapsible="true" expanded={this.state.expanded} onToggle={this.collapseToggle} className={classNames}>
				<Panel.Heading>
					   <div className="laji-form-clickable-panel-header" onClick={this.collapseToggle}>
						   <div className="panel-title">
							   {title}
							   <span className="pull-right">
								   <GlyphButton glyph={this.state.expanded ? "chevron-up" : "chevron-down"} variant="link" />
								   {showToggle ? <GlyphButton glyph="new-window" variant="link" onClick={poppedToggle} /> : null}
							   </span>
						   </div>
					   </div>
				</Panel.Heading>
				<Panel.Collapse>
					<ListGroup>
						{errors.map((props, i) => <ErrorPanelError key={i} clickHandler={clickHandler} {...props} />)}
					</ListGroup>
				</Panel.Collapse>
			</Panel>
		);
	}
}

function ErrorPanelError({label, error, id, getId, extra = null, disabled, clickHandler}) {
	const message = error && error.message ? error.message : error;
	const _clickHandler = React.useCallback(() => {
		clickHandler(id || (getId ? getId() : undefined));
	}, [clickHandler, id, getId]);

	const {ListGroupItem} = React.useContext(ReactContext).theme;
	return (
		<ListGroupItem onClick={_clickHandler} disabled={disabled}>
			{label ? <b>{label}:</b> : null} {message} {extra}
		</ListGroupItem>
	);
}

function NullTooltip() {
	return <div />;
}

// Tooltip component that doesn't show tooltip for empty/undefined tooltip.
export class TooltipComponent extends React.Component {
	static contextType = ReactContext;
	setOverlayRef = (elem) => {
		this.overlayElem = elem;
	}
	onMouseOver = () => this.overlayElem.show();
	onMouseOut = () => this.overlayElem.hide();

	render() {
		const {tooltip, children, id, placement, trigger, className} = this.props;

		const {OverlayTrigger, Tooltip} = this.context.theme;
		const overlay = (
			<OverlayTrigger ref={this.setOverlayRef} placement={placement} trigger={trigger === "hover" ? [] : trigger} key={`${id}-overlay`} overlay={
				(tooltip) ? <Tooltip id={`${id}-tooltip`} className={`${className}`}>{React.isValidElement(tooltip) ? tooltip : <span dangerouslySetInnerHTML={{__html: tooltip}} />}</Tooltip> : <NullTooltip />
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

export const FetcherInput = React.forwardRef((props, ref) => {
	const {loading, validationState, glyph, extra, appendExtra, onMouseOver, onMouseOut, className = "", InputComponent, ...inputProps} = props; // eslint-disable-line @typescript-eslint/no-unused-vars
	const Input = InputComponent ? InputComponent : FetcherInputDefaultInput;
	const inputContent = (
		<React.Fragment>
			{extra}
			<Input {...inputProps} ref={ref} />
			{glyph}
			{loading && <Spinner />}
			{appendExtra}
		</React.Fragment>
	);
	const {InputGroup, FormGroup} = React.useContext(ReactContext).theme;

	const content = extra || appendExtra
		? (
			<InputGroup>
				{inputContent}
			</InputGroup>
		)
		: (
			<React.Fragment>
				{inputContent}
			</React.Fragment>
		);

	return (
		<FormGroup onMouseOver={onMouseOver} onMouseOut={onMouseOut} validationState={validationState} className={classNames(className, "fetcher-input")}>
			{content}
		</FormGroup>
	);
});

const FetcherInputDefaultInput = React.forwardRef((props, ref) => {
	const {readonly, ...inputProps} = props;
	const {FormControl} = React.useContext(ReactContext).theme;
	return <FormControl type="text" {...inputProps} readOnly={readonly} ref={ref} />;
});

// OverlayTrigger that is hoverable if hoverable === true
export class OverlayTrigger extends React.Component {
	static contextType = ReactContext;
	
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
			_context, //eslint-disable-line @typescript-eslint/no-unused-vars
			...props
		} = this.props;

		const {OverlayTrigger} = this.context.theme;
		if (!this.props.hoverable) return (
			<OverlayTrigger {...props} overlay={overlay}>
				{children}
			</OverlayTrigger>
		);

		let _overlay = React.cloneElement(overlay, {onMouseOver: this.overlayMouseOver, onMouseOut: this.overlayMouseOut});

		return (
			<div onMouseOver={this.overlayTriggerMouseOver} onMouseOut={this.overlayTriggerMouseOut}>
				<OverlayTrigger {...props}
				                delay={1}
				                trigger={[]} 
				                placement={this.props.placement || "top"}
				                ref={this.setOverlayTriggerRef}
				                overlay={_overlay}>
					{children}
				</OverlayTrigger>
			</div>
		);
	}
}

export class Fullscreen extends React.Component {
	componentDidMount() {
		this.bodyOverFlow = document.body.style.overflow;

		if (this.props.onKeyDown) {
			this._onKeyDown = true;
			new Context(this.props.contextId).addGlobalEventHandler("keydown", this.props.onKeyDown);
		}
	}

	componentWillUnmount() {
		document.body.style.overflow = this.bodyOverFlow;
		if (this._onKeyDown) {
			new Context(this.props.contextId).removeGlobalEventHandler("keydown", this.props.onKeyDown);
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

export class FailedBackgroundJobsPanel extends React.Component {
	static contextType = ReactContext;
	constructor(props) {
		super(props);
		this.state = {popped: true};
	}

	dismissFailedJob = ({id, hook, running}) => (e) => {
		e.stopPropagation();
		if (running) return;
		this.props.context.removeSubmitHook(id, hook);
	}

	retryFailedJob = ({hook, running}) => (e) => {
		e.stopPropagation();
		if (running) return;
		hook();
	}

	poppedToggle = (e) => {
		e.stopPropagation();
		this.setState({popped: !this.state.popped, poppedTouched: true});
	}

	render() {
		const {jobs = [], schema, uiSchema = {}, formContext: {translations}} = this.props;

		if (!jobs.length) return null;

		const {Glyphicon} = this.context.theme;

		const errors = jobs.reduce((_errors, error) => {
			const {lajiFormId, relativePointer, e, running} = error;
			if (!e) {
				return _errors;
			}
			const getJsonPointer = () => getJSONPointerFromLajiFormIdAndRelativePointer(this.props.tmpIdTree, this.props.context.formData, lajiFormId, relativePointer);
			const jsonPointer = getJsonPointer();
			const label = parseJSONPointer(uiSchema, `${uiSchemaJSONPointer(uiSchema, jsonPointer)}/ui:title`, "safely")
				|| parseJSONPointer(schema, `${schemaJSONPointer(schema, jsonPointer)}/title`, "safely");
			const retryButton = <a key="rety" className="pull-right" disabled={running} onClick={this.retryFailedJob(error)}><Glyphicon className={running ? "rotating" : ""} glyph="refresh" /> {translations.Retry}</a>;
			const dismissButton = <a key="dismiss" className="pull-right" onClick={this.dismissFailedJob(error)}><Glyphicon glyph="ok" /> {translations.Dismiss}</a>;

			const getId = () => {
				const jsonPointer = getJsonPointer();
				return `root_${JSONPointerToId(jsonPointer)}`;
			};
			const _error = {getId, error: e, extra: [dismissButton, retryButton], disabled: running};
			if (label) _error.label = label;
			return [..._errors, _error];
		}, []);

		if (!errors.length) return null;

		return (
			<div className={`laji-form-error-list laji-form-failed-jobs-list${this.state.popped ? " laji-form-popped" : ""}`}
			     style={this.state.popped ? {top: (this.props.formContext.topOffset || 0) + 5} : null} >
				<ErrorPanel 
					title={translations.FailedBackgroundJobs}
					errors={errors}
					showToggle={true}
					poppedToggle={this.poppedToggle}
					clickHandler={this.props.errorClickHandler}
					classNames="error-panel"
				/>
				<div className="panel-footer">
					<Button onClick={this.props.context.removeAllSubmitHook}><Glyphicon glyph="ok"/> {`${translations.Dismiss} ${translations.all}`}</Button>
				</div>
			</div>
		);
	}
}
