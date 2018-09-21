import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactAutosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import { Glyphicon, Popover, InputGroup, Tooltip } from "react-bootstrap";
import Spinner from "react-spinner";
import { isEmptyString, focusNextInput, focusById, stringifyKeyCombo, dictionarify, triggerParentComponent } from "../../utils";
import { FetcherInput, TooltipComponent, OverlayTrigger } from "../components";
import Context from "../../Context";
import { InformalTaxonGroupChooser, getInformalGroups } from "./InformalTaxonGroupChooserWidget";

export default class _AutosuggestWidget extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.string
		}).isRequired,
		value: PropTypes.string
	}

	render() {
		if (this.props.options) {
			switch (this.props.options.autosuggestField) {
			case "taxon":
				return <TaxonAutosuggestWidget {...this.props} />;
			case "unit":
				return <UnitAutosuggestWidget {...this.props} />;
			case "friends":
				return <FriendsAutosuggestWidget {...this.props} />;
			default: 
				return <RangeAutosuggestWidget {...this.props} />;
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
				break;
			default:
				component = RangeAutosuggestWidget;
			}
			const getSuggestionFromValue = component.prototype.getSuggestionFromValue;
			if (getSuggestionFromValue) {
				return <SimpleValueRenderer getSuggestionFromValue={getSuggestionFromValue} value={value}/>;
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
			this.props.getSuggestionFromValue.call(this, this.props.value).then((suggestion) => {
				this.setState({value: suggestion.value});
			}).catch(() => {});
		}
	}
	render() {
		return <span>{this.state.value}</span>;
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

		renderSuccessGlyph = () => <Glyphicon style={{pointerEvents: "none"}} glyph="ok" className="form-control-feedback"/>

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

	findExactMatch = (suggestions, value) => {
		return suggestions.find(suggestion => (suggestion && suggestion.payload.name.toLowerCase() === value.toLowerCase()));
	}

	renderSuccessGlyph = () => <Glyphicon style={{pointerEvents: "none"}}
															           glyph="user"
															           className="form-control-feedback"/>

	render() {
		const {options: propsOptions, ...propsWithoutOptions} = this.props;

		const options = {
			query: {
				includeSelf: true,
				...propsOptions.queryOptions
			},
			getSuggestionFromValue: this.getSuggestionFromValue,
			isValueSuggested: this.isValueSuggested,
			renderUnsuggested: this.renderUnsuggested,
			renderSuccessGlyph: this.renderSuccessGlyph,
			findExactMatch: this.findExactMatch,
		};

		return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
	}
}

class RangeAutosuggestWidget extends Component {
	render() {
		const {options: propsOptions, ...propsWithoutOptions} = this.props;
		return <Autosuggest highlightFirstSuggestion={true} {...propsWithoutOptions} {...propsOptions} />;
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

	isValueSuggested = (value, props) => {
		if (!props) props = this.props;
		const {isValueSuggested, suggestionReceive, onSuggestionSelected} = props;
		if (!onSuggestionSelected && suggestionReceive !== "key") return undefined;
		return isValueSuggested ? isValueSuggested(props.value) : undefined;
	}

	constructor(props) {
		super(props);
		const isSuggested = this.isValueSuggested(props.value, props);
		this.state = {
			isLoading: false,
			suggestions: [],
			unsuggested: false,
			focused: false,
			value: props.value !== undefined ? props.value : "",
			suggestion: isSuggested ? {} : undefined,
		};
		this.state = {...this.state, ...this.getStateFromProps(props)};
		this.apiClient = new ApiClient();
	}

	getStateFromProps(props) {
		const {value, suggestionReceive = "key"} = props;
		const {suggestion} = this.state;
		if (this.state.value !== value || (suggestion && suggestion[suggestionReceive] !== value && this.mounted)) {
			if (this.mounted && this.state.value !== value) {
				this.setState({value}, () => {
					this.triggerConvert(props);
				});
			} else {
				this.triggerConvert(props);
			}
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
		if (isEmptyString(value) || !getSuggestionFromValue)  {
			if (this.state.suggestion && Object.keys(this.state.suggestion).length > 0) {
				this.setState({suggestion: undefined, value});
			}
			return;
		}

		this.setState({isLoading: true});
		getSuggestionFromValue(value).then(suggestion => {
			if (!this.mounted) return;
			this.setState({suggestion, value: this.getSuggestionValue(suggestion), isLoading: false}, () => this.onSuggestionsFetchRequested(this.state, !"no debounce"));
		}).catch(() => {
			if (!this.mounted) return;
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

	onSuggestionsClearRequested = () => {
		this.clearRequested = true;
	}

	selectSuggestion = (suggestion) => {
		const {onSuggestionSelected, onChange, suggestionReceive} = this.props;
		const afterStateChange = () => {
			onSuggestionSelected ?
				onSuggestionSelected(suggestion) :
				onChange(suggestion[suggestionReceive || "key"]);
		};
		const state = {suggestion, value: this.getSuggestionValue(suggestion)};
		if (this.clearRequested) state.suggestions = [];
		this.mounted ? 
			this.setState(state, afterStateChange) :
			afterStateChange();
	}

	selectUnsuggested = (value) => {
		if (isEmptyString(value) && isEmptyString(this.props.value)) return;

		const {onConfirmUnsuggested, onChange} = this.props;

		const state = {value, suggestion: undefined};
		if (this.clearRequested) state.suggestions = [];
		this.setState(state, () => {
			onConfirmUnsuggested ?
				onConfirmUnsuggested(value) :
				onChange(value);
		});
	}

	onSuggestionSelected = (e, data) => {
		// Input onBlur/onFocus isn't called without this hack.
		this.reactAutosuggestRef.justSelectedSuggestion = false;

		const {suggestion} = data;
		e.preventDefault();
		if ("id" in this.props) {
			// Try focusing next and rely on the blur method to select the suggestion. If didn't focus next, select the suggestion.
			if (!focusNextInput(this.props.formContext.getFormRef(), document.getElementById(this.props.id))) {
				this.selectSuggestion(suggestion);
			}
		}
	}

	findExactMatch = (suggestions, value = "") => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const {findExactMatch} = this.props;
		return findExactMatch
			? findExactMatch(suggestions, value)
			: suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === value.toLowerCase() && (!suggestion.payload || !suggestion.payload.isNonMatching)));
	}

	findOnlyOneMatch = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const filtered = suggestions.filter(suggestion => !suggestion || !suggestion.payload || !suggestion.payload.isNonMatching);
		if (filtered.length === 1) {
			return filtered[0];
		}
	}
	
	findNonMatching = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const filtered = suggestions.filter(suggestion => suggestion && suggestion.payload  && suggestion.payload.isNonMatching);
		if (filtered.length === 1) {
			return filtered[0];
		}
	}

	onInputChange = (e, autosuggestEvent) => {
		const {newValue: value} = autosuggestEvent;
		this.setState({value}, () => {
			if (this.props.inputProps && this.props.inputProps.onChange) {
				e.persist();
				this.props.inputProps.onChange(e, autosuggestEvent);
			}
		});
	}

	onSuggestionsFetchRequested = ({value}, debounce = true) => {
		if (value === undefined) value = "";
		if (value === undefined || value.length < (this.props.minFetchLength !== undefined ? this.props.minFetchLength : 2)) {
			this.setState({suggestions: []});
			return;
		}	

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
				this.mounted
					? this.setState({isLoading: false}, this.afterBlurAndFetch)
					: this.afterBlurAndFetch();
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

	onFocus = (e) => {
		this.setState({focused: true}, () => this.onSuggestionsFetchRequested({value: this.state.value}));

		triggerParentComponent("onFocus", e, this.props.inputProps);
	}

	onBlur = (e, {highlightedSuggestion}) => {
		this.highlightedSuggestionOnBlur = highlightedSuggestion;
		this._valueForBlurAndFetch = this.state.value;
		this.setState({focused: false}, () => this.afterBlurAndFetch(this.state.suggestions));
		triggerParentComponent("onBlur", e, this.props.inputProps);
	}

	onKeyDown = (e) => {
		if (this.props.controlledValue && e.key === "Enter" && this.props.allowNonsuggestedValue && !this.state.loading && !isEmptyString(this.state.value)) {
			this.selectUnsuggested(this.state.value);
		}

		triggerParentComponent("onKeyDown", e, this.props.inputProps);
	}


	// This is used, because the default behavior doesn't render the suggestions when focusing
	// a suggestion component that wants to render the suggestion when the input is empty.
	renderSuggestionsContainer = ({containerProps, children}) => {
		if (!this.state.focused) return null;

		return (
			<div {...containerProps}>
				{children}
			</div>
		);
	}

	afterBlurAndFetch = (suggestions, callback) => {
		const {value = ""} = this.state;
		if (this._valueForBlurAndFetch === undefined) this._valueForBlurAndFetch = "";
		if (this.mounted && (this.state.focused || this.state.isLoading) || (this.props.controlledValue && this._valueForBlurAndFetch !== value)) return;

		const {selectOnlyOne, selectOnlyNonMatchingBeforeUnsuggested = true, informalTaxonGroups, informalTaxonGroupsValue, allowNonsuggestedValue} = this.props;

		const exactMatch = this.findExactMatch(suggestions, value);
		const onlyOneMatch = selectOnlyOne ? this.findOnlyOneMatch(suggestions) : undefined;
		const nonMatching = selectOnlyNonMatchingBeforeUnsuggested ? this.findNonMatching(suggestions) : undefined;
		const valueDidntChangeAndHasInformalTaxonGroup = this.props.value === value && informalTaxonGroups && informalTaxonGroupsValue && informalTaxonGroupsValue.length;

		if (this.highlightedSuggestionOnBlur) {
			this.selectSuggestion(this.highlightedSuggestionOnBlur);
		} else if (onlyOneMatch) {
			this.selectSuggestion(onlyOneMatch);
		}	else if (exactMatch) {
			this.selectSuggestion({...exactMatch, value});
		}	else if (nonMatching && !valueDidntChangeAndHasInformalTaxonGroup) {
			this.selectSuggestion(nonMatching);
		} else if (!valueDidntChangeAndHasInformalTaxonGroup && allowNonsuggestedValue) {
			this.selectUnsuggested(value);
		}

		callback && callback();
	}

	setRef = (ref) => {
		this.reactAutosuggestRef = ref;
	}

	render() {
		const {props} = this;
		let {suggestions, value} = this.state;
		if (value === undefined) value = "";

		const inputProps = {
			id: this.props.id,
			value,
			readOnly: props.readonly,
			disabled: props.disabled,
			placeholder: props.placeholder,
			...(this.props.inputProps || {}),
			onChange: this.onInputChange,
			onBlur: this.onBlur,
			onFocus: this.onFocus,
			onKeyDown: this.onKeyDown
		};

		if (inputProps.value === undefined || inputProps.value === null) inputProps.value = "";

		let cssClasses = {
			suggestionsContainer: "rw-popup-container rw-popup-animation-box",
			suggestionsContainerOpen: "rw-popup",
			suggestionsList: "rw-list",
			suggestion: "rw-list-option",
			suggestionHighlighted: "rw-list-option rw-state-focus"
		};

		const highlightFirstSuggestion = "highlightFirstSuggestion" in this.props
			? this.props.highlightFirstSuggestion
			: !this.props.allowNonsuggestedValue;

		return (
			<div className="autosuggest-wrapper">
				<ReactAutosuggest
					ref={this.setRef}
					id={`${this.props.id}-autosuggest`}
					inputProps={inputProps}
					renderInputComponent={this.renderInput}
					suggestions={suggestions}
					getSuggestionValue={this.getSuggestionValue}
					renderSuggestion={this.renderSuggestion}
					renderSuggestionsContainer={this.renderSuggestionsContainer}
					onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
					onSuggestionsClearRequested={this.onSuggestionsClearRequested}
					onSuggestionSelected={this.onSuggestionSelected}
					focusInputOnSuggestionClick={false}
					highlightFirstSuggestion={highlightFirstSuggestion}
					alwaysRenderSuggestions={true}
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
		let {value, renderSuccessGlyph, renderSuggested, renderUnsuggested, informalTaxonGroups, renderInformalTaxonGroupSelector = true, taxonGroupID, onToggle} = this.props;
		let validationState = null;
		const {translations, lang} = this.props.formContext;
		const {suggestion} = this.state;

		let isSuggested = this.isValueSuggested(value);
		if (isSuggested) isSuggested = isSuggested && !!suggestion;

		if (!isEmptyString(value) && isSuggested !== undefined) {
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

			const {shortcuts = []} = new Context(this.props.formContext.contextId);
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
					<InputGroup.Addon className={`autosuggest-input-addon power-user-addon${this.props.toggled ? " active" : ""}`} onMouseDown={this.onToggle}>
						<Glyphicon glyph="flash"/>
				</InputGroup.Addon>
				</TooltipComponent>
			) : null;

		const inputValue = isEmptyString(this.state.value) ? "" : this.state.value;
		const input = (
			<FetcherInput 
				value={inputValue}
				glyph={glyph} 
				loading={this.state.isLoading} 
				validationState={validationState} 
				extra={addon}
				appendExtra={toggler}
				getRef={this.setInputRef}
				className={toggler && this.state.focused ? "has-toggler" : undefined}
				{...inputProps} 
			/>
		);

		let component = input;
		if (value && isSuggested && renderSuggested) {
			component = renderSuggested(input, suggestion);
		} else if (value && isSuggested === false && renderUnsuggested) {
			component = renderUnsuggested(input);
		}
		if (informalTaxonGroups) {
			component = (
				<div>
					{component}
					{this.state.informalTaxonGroupsOpen && <InformalTaxonGroupChooser modal={true} onHide={this.onInformalTaxonGroupHide} onSelected={this.onInformalTaxonGroupSelected} translations={translations} lang={lang} />}
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
		if ( isEmptyString(value)) { 
			this.setState({scientificName: "", cursiveName: false});
		} else {
			new ApiClient().fetchCached(`/taxa/${value}`).then(({scientificName, cursiveName, vernacularName, taxonRank, informalTaxonGroups}) => {
				if (!this.mounted) return;
				this.setState({value, taxonRank, informalTaxonGroups, taxon: {scientificName, vernacularName, cursiveName}});

				getInformalGroups().then(({informalTaxonGroupsById}) => {
					if (!this.mounted) return;
					this.setState({informalTaxonGroupsById});
				});
			});
			new ApiClient().fetchCached(`/taxa/${value}/parents`).then(parents => {
				if (!this.mounted) return;
				const state = {order: undefined, family: undefined};
				for (let parent of parents) {
					const {vernacularName, scientificName, cursiveName} = parent;
					if (parent.taxonRank === "MX.order") {
						state.order = {vernacularName, scientificName, cursiveName};
					} else if (parent.taxonRank === "MX.family") {
						state.family = {vernacularName, scientificName, cursiveName};
					}
					if (state.order && state.family) {
						this.setState(state);
						break;
					}
				}
				this.setState({...state, higherThanOrder: !state.order && !state.family});
			});
			new ApiClient().fetchCached("/metadata/ranges/MX.taxonRankEnum").then(taxonRanks => {
				if (!this.mounted) return;
				this.setState({taxonRanks: dictionarify(taxonRanks, function getKey(rank) {return rank.id;}, function getValue(rank) {return rank.value;})});
			});
		}
	}

	render() {
		const {id, formContext, value, children, placement} = this.props;
		const {
			taxon = {},
			taxonRanks,
			taxonRank,
			order,
			family,
			higherThanOrder,
			informalTaxonGroupsById = {},
			informalTaxonGroups = []
		} = this.state;

		const tooltipElem = (
			<Tooltip id={`${id}-popover-tooltip`}>
				{formContext.translations.OpenSpeciedCard}
			</Tooltip>
		);

		let imageID = informalTaxonGroups[0];
		if (informalTaxonGroupsById[imageID] && informalTaxonGroupsById[imageID].parent) {
			imageID = informalTaxonGroupsById[imageID].parent.id;
		}

		const loading = !taxonRank || !(order || family || higherThanOrder) || !taxonRanks;

		const TaxonName = ({scientificName, vernacularName = "", cursiveName}) => {
			const _scientificName = vernacularName && scientificName
				?  `(${scientificName})`
				: (scientificName || "");
			return (
				<React.Fragment>
					{`${vernacularName}${vernacularName ? " " : ""}`}
					{cursiveName ? <i>{_scientificName}</i> : _scientificName}
				</React.Fragment>
			);
		};

		const popover = (
			<Popover id={`${id}-popover`}>
				<div className={`laji-form taxon-popover informal-group-image ${imageID}`}>
					<div>
						<OverlayTrigger overlay={tooltipElem}>
							<a href={`http://tun.fi/${value}`} target="_blank" rel="noopener noreferrer">
								{taxon.vernacularName && <React.Fragment><TaxonName {...taxon} /><br /></React.Fragment>}
							</a>
						</OverlayTrigger>
						<strong>{formContext.translations.taxonomicRank}:</strong> {taxonRanks && taxonRank ? taxonRanks[taxonRank] : ""}<br />
						{!higherThanOrder ? (
							<React.Fragment>
								<strong>{formContext.translations.taxonGroups}:</strong>
								<ul>
									{order && <li><TaxonName {...order} /></li>}
										{family && <li><TaxonName {...family} /></li>}
								</ul>
							</React.Fragment>
						) : <React.Fragment><br /><br /></React.Fragment>}
					</div>
					{loading && <Spinner />}
				</div>
			</Popover>
		);

		return (
			<OverlayTrigger hoverable={true}
			                placement={placement}
			                _context={new Context(this.props.formContext.contextId)}
											overlay={popover}>
				{children}
			</OverlayTrigger>
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
		getInformalGroups().then(({informalTaxonGroupsById}) => {
			if (!this.mounted) return;
			this.setState({informalTaxonGroupsById});
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
				<InputGroup.Addon className="autosuggest-input-addon informal-taxon-group-chooser" onClick={this.toggle} tabIndex={0}>
					{this.renderGlyph()}
				</InputGroup.Addon>
			</TooltipComponent>
		);
	}
}

