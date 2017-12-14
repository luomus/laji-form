import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import ReactAutosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import { Tooltip, OverlayTrigger, Glyphicon, Popover, InputGroup, ListGroup, ListGroupItem } from "react-bootstrap";
import Spinner from "react-spinner";
import { isEmptyString, focusNextInput, isDescendant } from "../../utils";
import { FetcherInput, TooltipComponent } from "../components";
import Context from "../../Context";

export default class _AutosuggestWidget extends Component {
	render() {
		if (this.props.options) {
			switch (this.props.options.autosuggestField) {
			case "taxon":
				return <TaxonAutosuggestWidget {...this.props} />;
			case "friends":
				return <FriendsAutosuggestWidget {...this.props} />;
			}
		}
		return <Autosuggest {...this.props} />;
	}
}

class TaxonAutosuggestWidget extends Component {
	getSuggestionFromValue = (value) => {
		const isValueSuggested = this.isValueSuggested;
		if (isValueSuggested(value)) {
			return new ApiClient().fetchCached(`/taxa/${value}`).then(({vernacularName, scientificName}) => {
				if (vernacularName !== undefined) {
					return {value: vernacularName, key: value};
				}
				if (scientificName !== undefined) {
					return {value: scientificName, key: value};
				}
			});
		} else {
			return Promise.reject();
		}
	}

	isValueSuggested = (value) => {
		return !isEmptyString(value) && !!value.match(/MX\.\d+/);
	}
	
	renderUnsuggested = (props) => (input) => {
		const tooltip = (
			<Tooltip id={`${props.id}-tooltip`}>{props.formContext.translations.UnknownSpeciesName}</Tooltip>
		);
		return (
			<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
		);
	}

	renderSuggested = (input, suggestion) => (
		<TaxonCardOverlay value={suggestion.key} formContext={this.props.formContext} id={this.props.id} trigger="hover">
			{input}
		</TaxonCardOverlay>
	)

	renderSuccessGlyph = (value) => {
		return (
			<a href={"http://tun.fi/" + value} target="_blank" rel="noopener noreferrer">
				<Glyphicon style={{pointerEvents: "none"}} glyph="tag" className="form-control-feedback"/>
			</a>
		);
	}

	render() {
		const {props} = this;

		const {options: propsOptions, ...propsWithoutOptions} = props;

		const options = {
			getSuggestionFromValue: this.getSuggestionFromValue,
			isValueSuggested: this.isValueSuggested,
			renderSuggested: this.renderSuggested,
			renderUnsuggested: this.renderUnsuggested(props),
			renderSuccessGlyph: this.renderSuccessGlyph,
			query: {...propsOptions.queryOptions}
		};

		return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
	}
}

class FriendsAutosuggestWidget extends Component {
	
	getSuggestionFromValue = (value) => {
		if (this.isValueSuggested(value)) {
			return new ApiClient().fetchCached(`/person/by-id/${value}`).then(({fullName}) => {
				if (fullName) {
					return {value: fullName, key: value};
				}
			});
		} else {
			return Promise.reject();
		}
	}

	isValueSuggested = (value) => {
		return !isEmptyString(value) && value.match(/MA\.\d+/);
	}

	renderUnsuggested = (input) => {
		const tooltip = (
			<Tooltip id={`${this.props.id}-tooltip`}>{this.props.formContext.translations.UnknownName}</Tooltip>
		);
		return (
			<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
		);
	}

	renderSuccessGlyph = () => <Glyphicon style={{pointerEvents: "none"}}
															           glyph="user"
															           className="form-control-feedback"/>

	render() {
		const {props} = this;
		const {options: propsOptions, ...propsWithoutOptions} = props;

		const options = {
			query: {
				includeSelf: true,
				...propsOptions.queryOptions
			},
			getSuggestionFromValue: this.getSuggestionFromValue,
			isValueSuggested: this.isValueSuggested,
			renderUnsuggested: this.renderUnsuggested,
			renderSuccessGlyph: this.renderSuccessGlyph,
		};

		return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
	}
}

export class Autosuggest extends Component {
	static propTypes = {
		autosuggestField: PropTypes.string,
		allowNonsuggestedValue: PropTypes.bool,
		onSuggestionSelected: PropTypes.func,
		onConfirmUnsuggested: PropTypes.func,
		onInputChange: PropTypes.func,
		uiSchema: PropTypes.object,
		informalTaxonGroups: PropTypes.string,
		onInformalTaxonGroupSelected: PropTypes.func,
	}

	static defaultProps = {
		allowNonsuggestedValue: true,
	}

	constructor(props) {
		super(props);
		const isSuggested = props.isValueSuggested && props.isValueSuggested(props.value);
		this.state = {
			isLoading: false,
			suggestions: [],
			unsuggested: false,
			focused: false,
			value: props.value,
			suggestion: isSuggested ? {} : undefined
		};
		this.apiClient = new ApiClient();
	}

	getStateFromProps(props) {
		const {value, suggestionReceive} = props;
		const {suggestion} = this.state;
		if (!suggestion || suggestion[suggestionReceive || "key"] !== value) {
			return {value: props.value};
		}
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert();
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	triggerConvert = () => {
		const {value, getSuggestionFromValue} = this.props;
		if (isEmptyString(value) || !getSuggestionFromValue) return;

		this.setState({isLoading: true});
		getSuggestionFromValue(value).then(suggestion => {
			if (!this.mounted) return;
			this.setState({suggestion, value: this.getSuggestionValue(suggestion), isLoading: false}, () => this.onSuggestionsFetchRequested(this.state, !"no debounce"));
		}).catch(() => {
			this.setState({isLoading: false});
		});
	}
	getSuggestionValue = (suggestion) => {
		return suggestion.value;
	}

	renderSuggestion = (suggestion) => {
		let {renderSuggestion} = this.props;
		if (!renderSuggestion) renderSuggestion = suggestion => suggestion.value;
		return (<span className="simple-option">{renderSuggestion(suggestion)}</span>);
	}

	onSuggestionsClearRequested = () => {}

	selectSuggestion = (suggestion) => {
		const {onSuggestionSelected, onChange, suggestionReceive} = this.props;
		const afterStateChange = () => {
			onSuggestionSelected ?
				onSuggestionSelected(suggestion) :
				onChange(suggestion[suggestionReceive || "key"]);
		};
		this.mounted ? 
			this.setState({suggestion, value: this.getSuggestionValue(suggestion)}, afterStateChange) :
			afterStateChange();
	}

	selectUnsuggested = (value) => {
		if (isEmptyString(value) && isEmptyString(this.props.value)) return;

		const {onConfirmUnsuggested, onChange} = this.props;

		this.setState({value, suggestion: undefined}, () => {
			onConfirmUnsuggested ?
				onConfirmUnsuggested(value) :
				onChange(value);
		});
	}

	onSuggestionSelected = (e, {suggestion, method}) => {
		e.preventDefault();
		if (method === "click") {
			if ("id" in this.props) focusNextInput(this.props.formContext.getFormRef(), document.getElementById(this.props.id));
		}
		this.selectSuggestion(suggestion);
	}

	findExactMatch = (suggestions, value) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		return suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === value.toLowerCase()));
	}

	onInputChange = (e, {newValue: value}) => {
		this.setState({value});
	}

	onSuggestionsFetchRequested = ({value}, debounce = true) => {
		if (!value || value.length < 2) return;
		const {autosuggestField, query = {}} = this.props;

		this.setState({isLoading: true});

		const request = () => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			this.apiClient.fetchCached("/autocomplete/" + autosuggestField, {q: value, includePayload: true, ...query}).then(suggestions => {
				this.mounted ?
					this.setState({isLoading: false, suggestions}, () => this.afterBlurAndFetch(suggestions)) :
					this.afterBlurAndFetch(suggestions);
			}).catch(() => {
				this.setState({isLoading: false}, this.afterBlurAndFetch);
			});
		};

		const context = new Context(this.props.formContext.contextId);
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		if (debounce) {
			this.timeout = context.setTimeout(request, 400);
		} else {
			request();
		}
	}

	onFocus = () => {
		this.setState({focused: true});
	}

	onBlur = () => {
		this.setState({focused: false}, () => this.afterBlurAndFetch(this.state.suggestions));
	}

	afterBlurAndFetch = (suggestions) => {
		if (this.mounted && (this.state.focused || this.state.isLoading)) return;

		const {value} = this.state;

		const exactMatch = this.findExactMatch(suggestions, value);

		if (exactMatch) {
			this.selectSuggestion({...exactMatch, value});
		} else {
			this.selectUnsuggested(value);
		}
	}

	render() {
		const {props} = this;
		let {suggestions, value} = this.state;

		const inputProps = {
			id: this.props.id,
			value,
			readOnly: props.readonly,
			disabled: props.disabled,
			placeholder: props.placeholder,
			onChange: this.onInputChange,
		};

		if (inputProps.value === undefined || inputProps.value === null) inputProps.value = "";

		let cssClasses = {
			suggestionsContainer: "rw-popup-container rw-popup-animation-box",
			suggestionsContainerOpen: "rw-popup",
			suggestionsList: "rw-list",
			suggestion: "rw-list-option",
			suggestionHighlighted: "rw-list-option rw-state-focus"
		};

		const highlightFirstSuggestion = "highlightFirstSuggestion" in this.props ?
			this.props.hightlightFirstSuggestion :
			!this.props.allowNonsuggestedValue;

		return (
			<div className="autosuggest-wrapper" onFocus={this.onFocus} onBlur={this.onBlur}>
				<ReactAutosuggest
					id={`${this.props.id}-autosuggest`}
					inputProps={inputProps}
					renderInputComponent={this.renderInput}
					suggestions={suggestions}
					getSuggestionValue={this.getSuggestionValue}
					renderSuggestion={this.renderSuggestion}
					onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
					onSuggestionsClearRequested={this.onSuggestionsClearRequested}
					onSuggestionSelected={this.onSuggestionSelected}
					focusInputOnSuggestionClick={false}
					highlightFirstSuggestion={highlightFirstSuggestion}
					theme={cssClasses}
				/>
			</div>
		);
	}

	onInformalTaxonGroupsOpened = (open) => {
		this.setState({informalTaxonGroupsOpen: open});
	}

	onInformalTaxonGroupSelected = (id) => {
		this.setState({informalTaxonGroupsOpen: false, focused: false});
		this.props.onInformalTaxonGroupSelected && this.props.onInformalTaxonGroupSelected(id);
	}

	renderInput = (inputProps) => {
		let validationState = null;
		let {value, renderSuccessGlyph, renderSuggested, renderUnsuggested, informalTaxonGroups, taxonGroupID} = this.props;
		const {suggestion} = this.state;

		const isSuggested = !!suggestion;

		if (!isEmptyString(value)) {
			validationState = isSuggested ? "success" : "warning";
		}

		const getGlyphNameFromState = (state) => {
			switch (state) {
			case "success":
				return "ok";
			case "warning":
				return "warning-sign";
			case "error":
				return "remove";
			default:
				return "";
			}
		};

		const getGlyph = (state) => {
			const glyph = getGlyphNameFromState(state);

			return glyph ? (
				<Glyphicon
					style={{pointerEvents: "none"}}
					glyph={glyph}
					className="form-control-feedback"
				/>
			) : null;
		};

		// react-bootstrap components can't be used here because they require using form-group which breaks layout.
		let glyph = undefined;

		if (!this.state.focused && !this.state.isLoading) {
			glyph = (validationState === "success" && renderSuccessGlyph) ?
				renderSuccessGlyph(value) : getGlyph(validationState);
		}

		const addon = informalTaxonGroups 
			? <InformalTaxonGroupsAddon taxonGroupID={taxonGroupID} 
																	onClear={this.onInformalTaxonGroupSelected} 
																	open={this.state.informalTaxonGroupsOpen}
																	onOpen={this.onInformalTaxonGroupsOpened} 
																	formContext={this.props.formContext} /> 
			: null;

		const inputValue = isEmptyString(this.state.value) ? "" : this.state.value;
		const input = (
			<FetcherInput 
				{...inputProps} 
				value={inputValue}
				glyph={glyph} 
				loading={this.state.isLoading} 
				validationState={validationState} 
				extra={addon}
			/>
		);

		let component = input;
		if (value && isSuggested && renderSuggested) {
			component = renderSuggested(input, suggestion);
		} else if (value && !isSuggested && renderUnsuggested) {
			component = renderUnsuggested(input);
		}
		if (informalTaxonGroups) {
			component = (
				<div>
					{component}
					<InformalTaxonGroupList show={this.state.informalTaxonGroupsOpen} onSelected={this.onInformalTaxonGroupSelected} taxonGroupID={taxonGroupID} />
				</div>
			);
		}
		return component;
	}
}

class TaxonCardOverlay extends Component {
	constructor(props) {
		super(props);
		this.state = {converted: false};
	}

	componentDidMount() {
		this.mounted = true;
		this.fetch(this.props.value);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentWillReceiveProps({value}) {
		this.fetch(value);
	}

	fetch(value) {
		let urlTxt = "", urlTxtIsCursive = false;
		isEmptyString(value) ? 
			this.setState({urlTxt, urlTxtIsCursive}) :
			new ApiClient().fetchCached(`/taxa/${value}`).then(response => {
				this.mounted && this.setState({urlTxt: response.scientificName, value, urlTxtIsCursive: response.cursiveName});
			});
	}

	popoverMouseOver = () => {
		this.popoverMouseIn = true;
	}

	popoverMouseOut = () => {
		this.popoverMouseIn = false;
		if (this.popoverTimeout) {
			clearTimeout(this.overlayTimeout);
		}
		this.popoverTimeout = new Context(this.props.formContext.contextId).setTimeout(() => {
			if (!this.popoverMouseIn && !this.overlayMouseIn && this.overlayRef) this.overlayRef.hide();
		}, 200);
	}

	getOverlayRef = elem => {
		this.overlayRef = elem;
	};

	overlayMouseOver = () => {
		this.overlayMouseIn = true;
		this.overlayRef.show();
	};

	overlayMouseOut = () => {
		this.overlayMouseIn = false;
		if (this.overlayTimeout) {
			clearTimeout(this.overlayTimeout);
		}
		this.overlayTimeout = new Context(this.props.formContext.contextId).setTimeout(() => {
			if (!this.popoverMouseIn && !this.overlayMouseIn && this.overlayRef) this.overlayRef.hide();
		}, 200);
	};

	render() {
		const {id, formContext, value, children, placement} = this.props;
		const {urlTxt, urlTxtIsCursive} = this.state;

		const tooltipElem = (
			<Tooltip id={`${id}-popover-tooltip`}>
				{formContext.translations.OpenSpeciedCard}
			</Tooltip>
		);

		const popover = (
			<Popover id={`${id}-popover`} onMouseOver={this.popoverMouseOver} onMouseOut={this.popoverMouseOut}>
				<span className="text-success">
					<Glyphicon glyph="tag" /> {formContext.translations.KnownSpeciesName}
				</span>
				{this.state.urlTxt ?
					<div>
						<OverlayTrigger overlay={tooltipElem}>
							<a href={`http://tun.fi/${value}`} target="_blank" rel="noopener noreferrer">
								<Glyphicon glyph="modal-window"/> {urlTxtIsCursive ? <i>{urlTxt}</i> : urlTxt}
							</a>
						</OverlayTrigger>
					</div> :
					<Spinner />
				}
			</Popover>
		);

		return (
			<div onMouseOver={this.overlayMouseOver} onMouseOut={this.overlayMouseOut}>
				<OverlayTrigger delay={1}
				                trigger={[]} 
				                placement={placement || "top"}
												ref={this.getOverlayRef}
				                overlay={popover}>
					{children}
				</OverlayTrigger>
			</div>
		);
	}
}

class InformalTaxonGroupsAddon extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.mounted = true;
		new ApiClient().fetchCached("/informal-taxon-groups/roots").then(response => {
			if (!this.mounted) return;
			this.setState({informalTaxonGroups: response.results.reduce((groups, group) => {
				groups[group.id] = group;
				return groups;
			}, {})});
		});
	}

	componentWillUnmount() {
		this.mounted = false;
		if (this.clickListener) new Context(this.props.formContext.contextId).removeEventListener(this.clickListener);
	}

	onClear = (e) => {
		e.stopPropagation();
		if (this.props.onClear) this.props.onClear(undefined);
	}

	toggle = () => {
		if (!this.props.open) {
			this._openRequested = true;

			if (this.clickListener) new Context(this.props.formContext.contextId).removeEventListener(this.clickListener);

			this.clickListener = new Context(this.props.formContext.contextId).addEventListener(document, "click", e => {
				if (!this.props.open || this._openRequested) {
					this._openRequested = false;
					return;
				}
				if (!isDescendant(findDOMNode(this.rootRef), e.target)) {
					this.toggle();
					return;
				}
			});
		}
		if (this.props.onOpen) this.props.onOpen(!this.props.open);
	}

	onBlur = () => {
		this.blurRequested = true;
		new Context(this.props.formContext.contextId).setTimeout(() => {
			if (!this.blurBlocked && this.props.onOpen) this.props.onOpen(false);
			this.blurRequested = false;
		}, 100);
	}

	renderGlyph = () => {
		const {taxonGroupID} = this.props;
		return taxonGroupID ?
			<span onClick={this.toggle}><div className={`informal-group-image ${taxonGroupID}`} /><button className="close" onClick={this.onClear}>×</button></span> :
			<Glyphicon glyph={"menu-hamburger"} onClick={this.toggle} />;
	}

	setRef = (elem) => {
		this.rootRef = elem;
	}

	render() {
		return (
			<TooltipComponent tooltip={this.props.taxonGroupID && this.state.informalTaxonGroups ? this.state.informalTaxonGroups[this.props.taxonGroupID].name : this.props.formContext.translations.PickInformalTaxonGroup}>
				<InputGroup.Addon className="informal-taxon-group-selector" tabIndex={0} ref={this.setRef}>
					{this.renderGlyph()}
				</InputGroup.Addon>
			</TooltipComponent>
		);
	}
}

class InformalTaxonGroupList extends Component {
	constructor(props) {
		super(props);
		this.state = {informalTaxonGroups: {}};
	}

	componentDidMount() {
		this.mounted = true;
		new ApiClient().fetchCached("/informal-taxon-groups/roots").then(response => {
			if (!this.mounted) return;
			this.setState({informalTaxonGroups: response.results.reduce((groups, group) => {
				groups[group.id] = group;
				return groups;
			}, {})});
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onGroupClick = (itg) => () => {
		if (!this.props.onSelected) return;
		this.props.onSelected(itg.id === this.props.taxonGroupID ? undefined : itg.id);
	}

	render() {
		return this.props.show ? (
			<ListGroup className="informal-taxon-groups-list">
				{Object.keys(this.state.informalTaxonGroups).map(id => {
					const itg = this.state.informalTaxonGroups[id];
					return (
						<ListGroupItem key={itg.name} onClick={this.onGroupClick(itg)} active={this.props.taxonGroupID === itg.id}>
							<div className={`informal-group-image ${itg.id}`} />
							{itg.name}
						</ListGroupItem>
					);
				})}
		</ListGroup>
		) : null;
	}
}
