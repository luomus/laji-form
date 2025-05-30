import * as React from "react";
import * as PropTypes from "prop-types";
import { findDOMNode, createPortal } from "react-dom";
import * as Spinner from "react-spinner";
import { schemaJSONPointer, uiSchemaJSONPointer, parseJSONPointer, JSONPointerToId, classNames } from "../utils";
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
		setTimeout(() => { // Without setImmediate focusing causes scroll to jump to top of page. Popover isn't positioned correctly probably right away.
			const domElem = findDOMNode(elem);
			domElem && domElem.focus();
		});
	}

	render() {
		const {props} = this;
		const {corner, tooltip, disabled, readonly, glyphButton = true, confirm, confirmPlacement, confirmStyle, ...maybeProps} = props; // eslint-disable-line @typescript-eslint/no-unused-vars
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
		if (!this.props.onAffixChange || !prevState || !this.state) {
			return;
		}
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

/**
 * @param standalone If provided, the help icon will handle **accessibility** itself.
 * If not provided, the parent element must take care of showing the tooltip.
 *
 * **accessibility** means that it handles showing the tooltip on focus & hover, and
 */
export function Help({help, id, focusable = false, onFocus, onBlur, className, onClick, standalone}) {
	const {Tooltip} = React.useContext(ReactContext).theme;

	const [focused, setFocused] = React.useState(undefined);

	const onHelpFocus = React.useCallback(() => {
		setFocused(true);
	}, []);

	const onHelpBlur = React.useCallback(() => {
		setFocused(false);
	}, []);

	const helpGlyph = <span className={classNames("laji-form-help-glyph", "text-muted", className)}
	                        tabIndex={focusable ? 0 : -1}
	                        onFocus={standalone ? onHelpFocus : onFocus}
	                        onBlur={standalone ? onHelpBlur : onBlur}
	                        onClick={onClick} />;
	const tooltip = <Tooltip id={id}><span dangerouslySetInnerHTML={{__html: help}} /></Tooltip>;
	return help ? (
		<OverlayTrigger placement="right" overlay={tooltip} show={standalone && focused || undefined}>
			<>
				{helpGlyph}
				{standalone && <div id={`${id}--help`} style={{ display: "none" }}>{ help }</div>}
			</>
		</OverlayTrigger>
	) : helpGlyph;
}

export function Label({label, children, id, required, registry = {}, uiSchema = {}}) {
	const {"ui:help": help, "ui:helpHoverable": helpHoverable, "ui:helpPlacement": helpPlacement, labelComponent} = uiSchema;
	const showHelp = label && help;
	const {Tooltip} = React.useContext(ReactContext).theme;

	const tooltipElem = (
		<Tooltip id={id + "-tooltip"}>{help ? (
			<span>
				<strong dangerouslySetInnerHTML={{__html: label}} /><br />
				<span dangerouslySetInnerHTML={{__html: help}} />
			</span>
		): label}</Tooltip>
	);

	const requiredHtml = required ? "<span class='text-danger'>*</span>" : "";

	const [focused, setFocused] = React.useState(undefined);

	const onHelpFocus = React.useCallback(() => {
		setFocused(true);
	}, []);

	const onHelpBlur = React.useCallback(() => {
		setFocused(false);
	}, []);

	const onHelpClick = React.useCallback((e) => {
		e.preventDefault();
	}, []);


	const LabelComponent = labelComponent || "label";

	const labelElem = (
		<LabelComponent htmlFor={id} aria-describedby={`${id}--help`}>
			<div style={{ whiteSpace: "normal" }}>
				<span dangerouslySetInnerHTML={{__html: label + requiredHtml}} />
				{showHelp ? <Help focusable={true} onFocus={onHelpFocus} onBlur={onHelpBlur} onClick={onHelpClick} id={id} /> : null}
			</div>
			{children}
		</LabelComponent>
	);

	return help ? <>
		<OverlayTrigger placement={helpPlacement || "right"} overlay={tooltipElem} hoverable={helpHoverable} formContext={registry.formContext} show={focused || undefined} style={{ display: "inline-block" }}>
			{labelElem}
		</OverlayTrigger>
		<div id={`${id}--help`} style={{ display: "none" }}>{ help }</div>
	</> : labelElem;
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
		const {errors, title, clickHandler, poppedToggle, showToggle, classNames, footer} = this.props;

		if (errors.length === 0) return null;

		const {Panel, ListGroup} = this.context.theme;

		return (
			<Panel collapsible="true" onToggle={this.collapseToggle} className={classNames}>
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
				<Panel.Collapse in={this.state.expanded}>
					<ListGroup>
						{errors.map((props, i) => <ErrorPanelError key={i} clickHandler={clickHandler} {...props} />)}
					</ListGroup>
				</Panel.Collapse>
				{footer
					? (
						<Panel.Footer>
							{footer}
						</Panel.Footer>
					)
					: null}
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

// Tooltip component that doesn't show tooltip for empty/undefined tooltip.
export class TooltipComponent extends React.Component {
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.state = {show: false};
	}

	onMouseOver = () => {
		this.setState({show: true});
	}

	onMouseOut = () => {
		this.setState({show: false});
	}

	render() {
		const {tooltip, children, id, placement, trigger, className} = this.props;

		const {OverlayTrigger, Tooltip} = this.context.theme;
		const overlay = (
			tooltip ? (
				<OverlayTrigger
					show={this.state.show}
					placement={placement}
					trigger={trigger === "hover" ? [] : trigger}
					key={`${id}-overlay`}
					overlay={
						<Tooltip id={`${id}-tooltip`} className={`${className}`}>{React.isValidElement(tooltip) ? tooltip : <span dangerouslySetInnerHTML={{__html: tooltip}} />}</Tooltip>
					}
				>
					{children}
				</OverlayTrigger>
			): <React.Fragment>{children}</React.Fragment>
		);

		return (trigger === "hover") ? (
			<div onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
				{overlay}
			</div>
		) : overlay;
	}
}

export const FetcherInput = React.forwardRef((props, ref) => {
	const {loading, validationState, glyph, extra, onMouseOver, onMouseOut, className = "", InputComponent, ...inputProps} = props; // eslint-disable-line @typescript-eslint/no-unused-vars
	const {InputGroup, FormGroup} = React.useContext(ReactContext).theme;
	const Input = InputComponent ? InputComponent : FetcherInputDefaultInput;

	const _extra = (!Array.isArray(extra)) ? [extra] : extra;
	const hasExtras = _extra.some(item => item !== null && item !== undefined);

	const inputContent = <>
		{hasExtras && <InputGroup.Button>{..._extra}</InputGroup.Button>}
		<Input {...inputProps} ref={ref} />
		{glyph}
		{loading && <Spinner />}
	</>;

	const content = hasExtras
		? (
			<InputGroup>
				{inputContent}
			</InputGroup>
		)
		: inputContent;

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

	constructor(props) {
		super(props);
		this.state = {};
	}

	componentWillUnmount() {
		if (this.overlayTimeout) {
			clearTimeout(this.overlayTimeout);
		}
	}

	overlayTriggerMouseOver = () => {
		this.setState({hoveringElem: true});
	};

	overlayTriggerMouseOut = () => {
		if (this.overlayTimeout) {
			clearTimeout(this.overlayTimeout);
		}
		if (this.props.hoverable) {
			this.overlayTimeout = this.props.formContext.setTimeout(() => {
				if (!this.popoverMouseIn && !this.overlayTriggerMouseIn) {
					this.setState({hoveringElem: false});
				}
			}, 200);
		} else { 
			this.setState({hoveringElem: false});
		}
	};

	overlayMouseOver = () => {
		this.setState({hoveringOverlay: true});
	}

	overlayMouseOut = () => {
		this.setState({hoveringOverlay: false, hoveringElem: false});
	}

	render() {
		const {
			children,
			overlay,
			contextId, //eslint-disable-line @typescript-eslint/no-unused-vars
			style,
			...props
		} = this.props;

		const {OverlayTrigger} = this.context.theme;

		let _overlay = React.cloneElement(overlay, {onMouseOver: this.overlayMouseOver, onMouseOut: this.overlayMouseOut});

		const show = this.props.show !== undefined
			? this.props.show
			: this.state.hoveringElem || this.props.hoverable && this.state.hoveringOverlay;

		return (
			<div onMouseOver={this.overlayTriggerMouseOver} onMouseOut={this.overlayTriggerMouseOut} style={style}>
				<OverlayTrigger
					{...props}
					delay={1}
					trigger={[]}
					placement={this.props.placement || "top"}
					overlay={_overlay}
					show={show}
				>
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

export class FailedBackgroundJobsPanel extends React.Component {
	static contextType = ReactContext;
	constructor(props) {
		super(props);
		this.state = {popped: true};
	}

	dismissFailedJob = ({id, hook, running}) => (e) => {
		e.stopPropagation();
		if (running) return;
		this.props.formContext.services.submitHooks.remove(id, hook);
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
			const getJsonPointer = () => this.props.formContext.services.ids.getJSONPointerFromLajiFormIdAndRelativePointer(lajiFormId, relativePointer);
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

		const footer = (
			<Button onClick={this.props.formContext.services.submitHooks.removeAll}><Glyphicon glyph="ok"/> {`${translations.Dismiss} ${translations.all}`}</Button>
		);

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
					footer={footer}
				/>
			</div>
		);
	}
}
