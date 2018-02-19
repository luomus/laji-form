import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactAutosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import { OverlayTrigger, Glyphicon, Popover, InputGroup, Tooltip } from "react-bootstrap";
import Spinner from "react-spinner";
import { isEmptyString, focusNextInput, focusById, stringifyKeyCombo } from "../../utils";
import { FetcherInput, TooltipComponent, } from "../components";
import Context from "../../Context";
import { InformalTaxonGroupChooser, getInformalGroups } from "./InformalTaxonGroupChooserWidget";

export default class _AutosuggestWidget extends Component {
	render() {
		if (this.props.options) {
			switch (this.props.options.autosuggestField) {
			case "taxon":
				return <TaxonAutosuggestWidget {...this.props} />;
			case "unit":
				return <UnitAutosuggestWidget {...this.props} />;
			case "friends":
				return <FriendsAutosuggestWidget {...this.props} />;
			}
		}
		return <Autosuggest {...this.props} />;
	}

	formatValue(value, options) {
		if (options) {
			let component = undefined;
			switch (options.autosuggestField) {
			case "taxon":
				component = TaxonAutosuggestWidget;
				break;
			case "unit":
				component = UnitAutosuggestWidget;
				break;
			case "friends":
				component = FriendsAutosuggestWidget;
			}
			const getSuggestionFromValue = component.prototype.getSuggestionFromValue;
			if (getSuggestionFromValue) {
				return <SimpleValueRenderer getSuggestionFromValue={getSuggestionFromValue} value={value}/>
			}
		}
	}
}

class SimpleValueRenderer extends Component {
	constructor(props) {
		super(props);
		this.state = {value: this.props.value};
	}
	componentDidMount() {
		if (this.props.getSuggestionFromValue) {
			this.isValueSuggested = FriendsAutosuggestWidget.prototype.isValueSuggested.bind(this);
			this.props.getSuggestionFromValue.call(this, this.props.value).then(({value}) => {
				this.setState({value});
			});
		}
	}
	render() {
		return <span>{this.state.value}</span>
	}

}

function TaxonAutosuggest(ComposedComponent) {
	return class TaxonAutosuggestWidget extends ComposedComponent {
		constructor(props) {
			super(props);
			this.getSuggestionFromValue = this.getSuggestionFromValue.bind(this);
			this.isValueSuggested = this.isValueSuggested.bind(this);
		}

		getSuggestionFromValue(value) {
			if (this.isValueSuggested(value)) {
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
				<OverlayTrigger overlay={tooltip} placement="top">{input}</OverlayTrigger>
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
				renderSuggestion: this.renderSuggestion,
				query: {...propsOptions.queryOptions}
			};

			return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
		}
	};
}

@TaxonAutosuggest
class TaxonAutosuggestWidget extends Component {}

@TaxonAutosuggest
class UnitAutosuggestWidget extends Component {
	renderSuggestion = (suggestion) => {
		const {count, maleIndividualCount, femaleIndividualCount} = suggestion.payload.interpretedFrom;
		const [countElem, maleElem, femaleElem] = [count, maleIndividualCount, femaleIndividualCount].map(val => 
			val && <span className="text-muted">{val}</span>
		);
		const taxonName = suggestion.payload.unit.identifications[0].taxon;
		const name = suggestion.payload.isNonMatching
			? <span className="text-muted">{taxonName} <i>({this.props.formContext.translations.unknownSpeciesName})</i></span>
			: taxonName;
		return <span>{countElem}{countElem && " "}{name}{maleElem && " "}{maleElem}{femaleElem && " "}{femaleElem}</span>;
	}
}

class FriendsAutosuggestWidget extends Component {
	constructor(props) {
		super(props);
		this.getSuggestionFromValue = this.getSuggestionFromValue.bind(this);
		this.isValueSuggested = this.isValueSuggested.bind(this);
	}

	getSuggestionFromValue(value) {
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

	isValueSuggested(value) {
		return !isEmptyString(value) && value.match(/MA\.\d+/);
	}

	renderUnsuggested = (input) => {
		const tooltip = (
			<Tooltip id={`${this.props.id}-tooltip`}>{this.props.formContext.translations.UnknownName}</Tooltip>
		);
		return (
			<OverlayTrigger overlay={tooltip} placement="top">{input}</OverlayTrigger>
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
			suggestion: isSuggested ? {} : undefined,
		};
		this.state = {...this.state, ...this.getStateFromProps(props)};
		this.apiClient = new ApiClient();
	}

	getStateFromProps(props) {
		const {value, suggestionReceive = "key"} = props;
		const {suggestion} = this.state;
		if (suggestion && suggestion[suggestionReceive] !== value && this.mounted) {
			this.triggerConvert(props);
		} else if (!suggestion) {
			return {value: props.value};
		}
	}

	componentWillReceiveProps(props) {
		const state = this.getStateFromProps(props);
		state && this.setState(state);
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
		new Context(this.props.formContext.contextId).addKeyHandler(this.props.id, this.keyFunctions);
	}

	componentWillUnmount() {
		this.mounted = false;
		new Context(this.props.formContext.contextId).removeKeyHandler(this.props.id, this.keyFunctions);
	}

	keyFunctions = {
		autosuggestToggle: () => {
			if (this.props.onToggle) {
				this.onToggle();
				return true;
			}
			return false;
		}
	}

	triggerConvert = (props) => {
		const {value, getSuggestionFromValue} = props;
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

	onSuggestionSelected = (e, data) => {
		const {suggestion, method} = data;
		e.preventDefault();
		if (method === "click") {
			if ("id" in this.props) focusNextInput(this.props.formContext.getFormRef(), document.getElementById(this.props.id));
		}
		this.selectSuggestion(suggestion);
	}

	findExactMatch = (suggestions, value = "") => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		return suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === value.toLowerCase() && (!suggestion.payload || !suggestion.payload.isNonMatching)));
	}

	findOnlyOneMatch = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const filtered = suggestions.filter(suggestion => !suggestion.payload  || !suggestion.payload.isNonMatching);
		if (filtered.length === 1) {
			return filtered[0];
		}
	}
	
	findNonMatching = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const filtered = suggestions.filter(suggestion => suggestion.payload  && suggestion.payload.isNonMatching);
		if (filtered.length === 1) {
			return filtered[0];
		}
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
			this.apiClient.fetchCached("/autocomplete/" + autosuggestField, {q: value, includePayload: true, matchType: "exact,partial", ...query}).then(suggestions => {
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
		// Wait for click triggering before executing.
		setTimeout(() => {
			if (this.mounted && (this.state.focused || this.state.isLoading)) return;

			const {value} = this.state;
			const {selectOnlyOne, selectOnlyNonMatchingBeforeUnsuggested = true, informalTaxonGroups, informalTaxonGroupsValue, allowNonsuggestedValue} = this.props;

			const exactMatch = this.findExactMatch(suggestions, value);
			const onlyOneMatch = selectOnlyOne ? this.findOnlyOneMatch(suggestions) : undefined;
			const nonMatching = selectOnlyNonMatchingBeforeUnsuggested ? this.findNonMatching(suggestions) : undefined;
			const valueDidntChangeAndHasInformalTaxonGroup = this.props.value === value && informalTaxonGroups && informalTaxonGroupsValue && informalTaxonGroupsValue.length;

			if (onlyOneMatch) {
				this.selectSuggestion(onlyOneMatch);
			}	else if (exactMatch) {
				this.selectSuggestion({...exactMatch, value});
			}	else if (nonMatching && !valueDidntChangeAndHasInformalTaxonGroup) {
				this.selectSuggestion(nonMatching);
			} else if (!valueDidntChangeAndHasInformalTaxonGroup && allowNonsuggestedValue) {
				this.selectUnsuggested(value);
			}
		}, 100);
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

	onInformalTaxonGroupHide = () => {
		this.setState({informalTaxonGroupsOpen: false});
	}

	onToggle = () => {
		if (!this.mounted) return;
		this.props.onToggle(!this.props.toggled);
		setImmediate(() => focusById(this.props.formContext, this.props.id), 1); // Refocus input
	}

	setInputRef = (elem) => {
		this.inputElem = elem;
	}

	renderInput = (inputProps) => {
		let validationState = null;
		let {value, renderSuccessGlyph, renderSuggested, renderUnsuggested, informalTaxonGroups, renderInformalTaxonGroupSelector = true, taxonGroupID, onToggle, isValueSuggested} = this.props;
		const {translations} = this.props.formContext;
		const {suggestion} = this.state;

		const isSuggested = !!suggestion && isValueSuggested(value);

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

		if (!this.state.focused && !this.state.isLoading && (!onToggle || !this.state.focused)) {
			glyph = (validationState === "success" && renderSuccessGlyph) ?
				renderSuccessGlyph(value) : getGlyph(validationState);
		}

		const addon = informalTaxonGroups && renderInformalTaxonGroupSelector
			? <InformalTaxonGroupsAddon taxonGroupID={taxonGroupID} 
																	onClear={this.onInformalTaxonGroupSelected} 
																	open={this.state.informalTaxonGroupsOpen}
																	onOpen={this.onInformalTaxonGroupsOpened} 
																	formContext={this.props.formContext} /> 
			: null;


		const getTogglerTooltip = () => {
			let tooltip = `${translations[this.props.toggled ? "StopShorthand" :  "StartShorthand"]}. ${translations.ShorthandHelp}`;

			const {shortcuts} = new Context(this.props.formContext.contextId);
			Object.keys(shortcuts).some(keyCombo => {
				if (shortcuts[keyCombo].fn == "autosuggestToggle") {
					tooltip = `[${stringifyKeyCombo(keyCombo)}]: ${tooltip}`;
					return true;
				}
			});
			return tooltip;
		};

		const toggler = onToggle && this.state.focused
			? (
				<TooltipComponent tooltip={getTogglerTooltip()} >
					<InputGroup.Addon className={`autosuggest-input-addon${this.props.toggled ? " active" : ""}`} onMouseDown={this.onToggle}>
						<Glyphicon glyph="flash"/>
				</InputGroup.Addon>
				</TooltipComponent>
			) : null;

		const inputValue = isEmptyString(this.state.value) ? "" : this.state.value;
		const input = (
			<FetcherInput 
				{...inputProps} 
				value={inputValue}
				glyph={glyph} 
				loading={this.state.isLoading} 
				validationState={validationState} 
				extra={addon}
				appendExtra={toggler}
				getRef={this.setInputRef}
				className={toggler && this.state.focused ? "has-toggler" : undefined}
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

					{this.state.informalTaxonGroupsOpen && <InformalTaxonGroupChooser onHide={this.onInformalTaxonGroupHide} onSelected={this.onInformalTaxonGroupSelected} translations={translations}/>}
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
		getInformalGroups().then(({informalTaxonGroups, informalTaxonGroupsById}) => {
			this.setState({informalTaxonGroups, informalTaxonGroupsById});
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onClear = (e) => {
		e.stopPropagation();
		if (this.props.onClear) this.props.onClear(undefined);
	}

	toggle = () => {
		if (this.props.onOpen) this.props.onOpen(!this.props.open);
	}

	renderGlyph = () => {
		const {taxonGroupID} = this.props;
		let imageID = taxonGroupID;
		const {informalTaxonGroupsById = {}} = this.state;
		if (informalTaxonGroupsById[taxonGroupID] && informalTaxonGroupsById[taxonGroupID].parent) {
			imageID = informalTaxonGroupsById[taxonGroupID].parent.id;
		}
		return taxonGroupID ?
			<span><div className={`informal-group-image ${imageID}`}/><button className="close" onClick={this.onClear}>×</button></span> :
			<Glyphicon glyph="menu-hamburger" />;
	}

	render() {
		return (
			<TooltipComponent tooltip={this.props.taxonGroupID && this.state.informalTaxonGroupsById ? this.state.informalTaxonGroupsById[this.props.taxonGroupID].name : this.props.formContext.translations.PickInformalTaxonGroup}>
				<InputGroup.Addon className="autosuggest-input-addon" onClick={this.toggle} tabIndex={0}>
					{this.renderGlyph()}
				</InputGroup.Addon>
			</TooltipComponent>
		);
	}
}
