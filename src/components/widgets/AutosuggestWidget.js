import * as React from "react";
import * as PropTypes from "prop-types";
import { Glyphicon, Popover, InputGroup, Tooltip, Modal, Row, Col } from "react-bootstrap";
import * as Spinner from "react-spinner";
import { isEmptyString, focusById, stringifyKeyCombo, dictionarify, triggerParentComponent, getUiOptions, classNames } from "../../utils";
import { FetcherInput, TooltipComponent, OverlayTrigger, Button } from "../components";
import Context from "../../Context";
import { InformalTaxonGroupChooser, getInformalGroups } from "./InformalTaxonGroupChooserWidget";

function renderFlag(suggestion, prepend) {
	return (suggestion && suggestion.payload || {}).finnish
		? <React.Fragment>{prepend || null}<img src={`${new Context().staticImgPath}/finnish-flag.png`} /></React.Fragment>
		: null;
}

export default class _AutosuggestWidget extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
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
			case "person":
				return <FriendsAutosuggestWidget {...this.props} />;
			default: 
				return <RangeAutosuggestWidget {...this.props} />;
			}
		}
		return <Autosuggest {...this.props} />;
	}

	formatValue(value, options, parentProps) {
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
			case "person":
				component = FriendsAutosuggestWidget;
				break;
			default:
				component = RangeAutosuggestWidget;
			}
			if (component) {
				return <SimpleValueRenderer component={component} value={value} formContext={parentProps.formContext} />;
			}
		}
	}
}

class SimpleValueRenderer extends React.Component {
	constructor(props) {
		super(props);
		this.state = {inputValue: this.props.value, loading: true};
	}
	componentDidMount() {
		const {getSuggestionFromValue, isValueSuggested} = this.props.component.prototype;
		if (getSuggestionFromValue && isValueSuggested) {
			this.isValueSuggested = isValueSuggested.bind(this);
			getSuggestionFromValue.call(this, this.props.value).then((suggestion) => {
				this.setState({inputValue: suggestion.value, loading: false});
			}).catch(() => this.setState({loading: false}));
		}
	}
	render() {
		return this.state.loading ? <Spinner /> : <span>{this.state.inputValue}</span>;
	}

}

function TaxonAutosuggest(ComposedComponent) {
	return class TaxonAutosuggestWidget extends ComposedComponent {
		constructor(props) {
			super(props);
			this.getSuggestionFromValue = this.getSuggestionFromValue.bind(this);
			this.isValueSuggested = this.isValueSuggested.bind(this);
			if (super.renderSuggestion) {
				this.renderSuggestion = super.renderSuggestion.bind(this);
			} else {
				this.renderSuggestion = this.renderSuggestion.bind(this);
			}
		}

		componentDidMount() {
			this.mounted = true;
		}

		componentWillUnmount() {
			this.mounted = false;
		}

		componentDidUpdate(prevProps) {
			const {value, options = {}} = this.props;
			if (value !== prevProps.value && options.getSuggestionFromValue && options.chooseImages) {
				options.getSuggestionFromValue(value).then(suggestion => {
					if (!this.mounted) return;
					const found = this.parseChooseImages(options.chooseImages).find(({id}) => suggestion.key === id);
					this.setState({chooseImages: found ? [found] : undefined});
				});
			}
		}

		getSuggestionFromValue(value) {
			if (this.isValueSuggested(value)) {
				return this.props.formContext.apiClient.fetchCached(`/taxa/${value}`).then(({vernacularName, scientificName}) => {
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

		isValueSuggested(value) {
			return !isEmptyString(value) && !!value.match(/MX\.\d+/);
		}

		parseInputValue(inputValue) {
			return inputValue.replace(/ sp(\.|p)?\.?$/, "");
		}

		renderUnsuggested = (props) => (input) => {
			const tooltip = (
				<Tooltip id={`${props.id}-tooltip`}>{props.formContext.translations.UnknownSpeciesName}</Tooltip>
			);
			return (
				<OverlayTrigger overlay={tooltip} placement="top">{input}</OverlayTrigger>
			);
		}

		renderSuggested = (input, suggestion) => {
			const {taxonCardPlacement: placement = "top" } = getUiOptions(this.props);
			return (
				<TaxonCardOverlay value={suggestion.key} formContext={this.props.formContext} id={this.props.id} trigger="hover" placement={placement}>
					{input}
				</TaxonCardOverlay>
			);
		}

		renderSuccessGlyph = () => <Glyphicon style={{pointerEvents: "none"}} glyph="ok" className="form-control-feedback"/>

		renderSuggestion(suggestion) {
			const renderedSuggestion = "autocompleteDisplayName" in suggestion
				&& <span dangerouslySetInnerHTML={{__html: suggestion.autocompleteDisplayName}} />
				|| <React.Fragment>{suggestion.value}{renderFlag(suggestion)}</React.Fragment>;
			return <span className="simple-option">{renderedSuggestion}</span>;
		}

		parseChooseImages = (chooseImages) => {
			return chooseImages.map(taxonIDOrObj => typeof taxonIDOrObj === "string" ? {id: taxonIDOrObj} : taxonIDOrObj);
		}

		renderChooseImages = () => {
			const chooseImages = this.state && this.state.chooseImages || this.props.options.chooseImages;
			const {orWriteSpeciesNameLabel} = getUiOptions(this.props);
			const {or} = this.props.formContext.translations;
			return (
				<Row>
					<Col xs={12}>
						<div className="laji-form-medias">
							{this.parseChooseImages(chooseImages).map(taxonIDObj =>
								<TaxonImgChooser id={taxonIDObj.id}
								                 key={taxonIDObj.id}
								                 url={taxonIDObj.url}
								                 onSelect={this.onTaxonImgSelected}
								                 formContext={this.props.formContext}/>
							)}
						</div>
					</Col>
					<Col xs={12}>
						<label>{or} {orWriteSpeciesNameLabel || this.props.formContext.translations.orWriteSpeciesName}</label>
					</Col>
				</Row>
			);
		}

		onTaxonImgSelected = (taxonID, taxon) => {
			this.autosuggestRef.selectSuggestion({
				key: taxonID,
				value: taxon.vernacularName,
				payload: taxon
			});
		}

		setAutosuggestRef = (elem) => {
			this.autosuggestRef = elem;
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
				parseInputValue: this.parseInputValue
			};
			const _options = {
				...options,
				...propsWithoutOptions,
				...(propsOptions || {}),
				query: {
					...(options.query || {}),
					...(propsWithoutOptions.query || {}),
					...(propsOptions.query || {}),
				}
			};

			if (propsOptions.chooseImages && !(props.value && props.formContext.uiSchemaContext.isEdit)) {
				_options.renderExtra = this.renderChooseImages;
			}

			return <Autosuggest ref={this.setAutosuggestRef} {..._options}/>;
		}
	};
}

@TaxonAutosuggest
class TaxonAutosuggestWidget extends React.Component {}

@TaxonAutosuggest
class UnitAutosuggestWidget extends React.Component {
	constructor(props) {
		super(props);
		this.renderSuggestion = this.renderSuggestion.bind(this);
	}
	renderSuggestion(suggestion) {
		const {count, maleIndividualCount, femaleIndividualCount} = suggestion.payload.interpretedFrom;
		const [countElem, maleElem, femaleElem] = [count, maleIndividualCount, femaleIndividualCount].map(val => 
			val && <span className="text-muted">{val}</span>
		);
		const taxonName = suggestion.payload.unit.identifications[0].taxon;
		const name = suggestion.payload.isNonMatching
			? <span className="text-muted">{taxonName} <i>({this.props.formContext.translations.unknownSpeciesName})</i></span>
			: taxonName;
		return <span>{countElem}{countElem && " "}{name}{maleElem && " "}{maleElem}{femaleElem && " "}{femaleElem}{renderFlag(suggestion)}</span>;
	}
}

class FriendsAutosuggestWidget extends React.Component {
	constructor(props) {
		super(props);
		this.getSuggestionFromValue = this.getSuggestionFromValue.bind(this);
		this.isValueSuggested = this.isValueSuggested.bind(this);
	}

	getSuggestionFromValue(value) {
		const {showID} = getUiOptions(this.props);
		const {isAdmin} = this.props.formContext.uiSchemaContext;
		if (this.isValueSuggested(value)) {
			return this.props.formContext.apiClient.fetchCached(`/person/by-id/${value}`).then(({fullName, group, id}) => {
				if (fullName) {
					const addGroup = str => group ? `${str} (${group})` : str;
					const addID = str => isAdmin && showID ? `${str} (${id})` : str;
					return {
						value: addID(addGroup(fullName)),
						key: value
					};
				}
			});
		} else {
			return Promise.reject();
		}
	}

	prepareSuggestion = (suggestion) => {
		const {isAdmin} = this.props.formContext.uiSchemaContext;
		const {showID} = getUiOptions(this.props);
		return isAdmin && showID
			? {...suggestion, value: `${suggestion.value} (${suggestion.key})`}
			: suggestion;
	}

	isValueSuggested(value) {
		return !isEmptyString(value) && value.match(/MA\.\d+/);
	}

	renderUnsuggested = (inputValue) => {
		const tooltip = (
			<Tooltip id={`${this.props.id}-tooltip`}>{this.props.formContext.translations.UnknownName}</Tooltip>
		);
		return (
			<OverlayTrigger overlay={tooltip} placement="top">{inputValue}</OverlayTrigger>
		);
	}

	findExactMatch = (suggestions, inputValue) => {
		return suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === inputValue.trim().toLowerCase()));
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
			prepareSuggestion: this.prepareSuggestion
		};

		return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
	}
}

class RangeAutosuggestWidget extends React.Component {
	render() {
		const {options: propsOptions, ...propsWithoutOptions} = this.props;
		return <Autosuggest highlightFirstSuggestion={true} {...propsWithoutOptions} {...propsOptions} />;
	}
}

export class Autosuggest extends React.Component {
	static propTypes = {
		autosuggestField: PropTypes.string,
		allowNonsuggestedValue: PropTypes.bool,
		onSuggestionSelected: PropTypes.func,
		onUnsuggestedSelected: PropTypes.func,
		onInputChange: PropTypes.func,
		uiSchema: PropTypes.object,
		informalTaxonGroups: PropTypes.string,
		onInformalTaxonGroupSelected: PropTypes.func,
	}

	static defaultProps = {
		allowNonsuggestedValue: true,
		suggestionReceive: "key"
	}

	isValueSuggested = (props) => {
		const {isValueSuggested, suggestionReceive, onSuggestionSelected} = props;
		if (!onSuggestionSelected && suggestionReceive !== "key") return undefined;
		return isValueSuggested ? isValueSuggested(props.value) : undefined;
	}

	constructor(props) {
		super(props);
		const isSuggested = this.isValueSuggested(props);
		this.state = {
			isLoading: false,
			suggestions: [],
			unsuggested: false,
			focused: false,
			inputValue: props.value !== undefined ? props.value : "",
			suggestion: isSuggested ? {} : undefined,
		};
		this.apiClient = this.props.formContext.apiClient;
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
		if (isEmptyString(value) || !getSuggestionFromValue) {
			if (this.state.suggestion && Object.keys(this.state.suggestion).length > 0) {
				this.setState({suggestion: undefined, inputValue: value});
			}
			return;
		}

		this.setState({isLoading: true});
		getSuggestionFromValue(value).then(suggestion => {
			if (!this.mounted) return;
			this.setState({suggestion, inputValue: suggestion.value, isLoading: false});
		}).catch(() => {
			if (!this.mounted) return;
			this.setState({isLoading: false});
		});
	}

	renderSuggestion = (suggestion) => {
		let {renderSuggestion} = this.props;
		if (!renderSuggestion) renderSuggestion = suggestion => suggestion.value;
		return (<span>{renderSuggestion(suggestion)}</span>);
	}

	selectSuggestion = (suggestion) => {
		const {onSuggestionSelected, onChange, suggestionReceive} = this.props;
		const afterStateChange = () => {
			onSuggestionSelected ?
				onSuggestionSelected(suggestion, this.mounted) :
				onChange(suggestion[suggestionReceive]);
		};
		const state = {suggestion, inputValue: suggestion.value};
		this.mounted
			? this.setState(state, afterStateChange)
			: afterStateChange();
	}

	selectUnsuggested = (value) => {
		if (isEmptyString(value) && isEmptyString(this.props.value)) return;

		const {onUnsuggestedSelected, onChange} = this.props;

		const afterStateChange = () => {
			onUnsuggestedSelected ?
				onUnsuggestedSelected(value) :
				onChange(value);
		};

		const state = {inputValue: value, suggestion: undefined};
		this.mounted
			? this.setState(state, afterStateChange)
			: afterStateChange();
	}

	onSuggestionSelected = (suggestion) => {
		this.selectSuggestion(suggestion);
	}

	onUnsuggestedSelected = (inputValue) => {
		this.selectUnsuggested(inputValue);
	}

	findExactMatch = (suggestions, inputValue = "") => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const {findExactMatch} = this.props;
		return findExactMatch
			? findExactMatch(suggestions, inputValue)
			: suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === inputValue.trim().toLowerCase() && (!suggestion.payload || !suggestion.payload.isNonMatching)));
	}

	findTheOnlyOneMatch = (suggestions) => {
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

	onInputChange = (e, reason, callback) => {
		let {value} = e.target;

		if (this.props.inputProps && this.props.inputProps.onChange) {
			e.persist && e.persist();
			value = this.props.inputProps.onChange(e, reason, callback);
		} 
		this.setState({inputValue: value}, callback);
	}

	onSuggestionsFetchRequested = ({value}, debounce = true) => {
		if (value === undefined || value === null) value = "";
		value = this.props.parseInputValue ? this.props.parseInputValue(value) : value;
		if (value.length < (this.props.minFetchLength !== undefined ? this.props.minFetchLength : 2)) {
			this.setState({suggestions: []});
			return;
		}	

		const {autosuggestField, query = {}} = this.props;

		this.setState({isLoading: true});

		const request = () => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			this.apiClient.fetchCached("/autocomplete/" + autosuggestField, {q: value, includePayload: true, matchType: "exact,partial", includeHidden: false, ...query}).then(suggestions => {
				if (this.props.prepareSuggestion) {
					suggestions = suggestions.map(s => this.props.prepareSuggestion(s));
				}
				if (timestamp !== this.promiseTimestamp) {
					return;
				}
				this.mounted
					? this.setState({isLoading: false, suggestions}, () => this.afterBlurAndFetch(suggestions))
					: this.afterBlurAndFetch(suggestions);
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
			this.timeout = context.setTimeout(request, 100);
		} else {
			request();
		}
	}

	onFocus = (e) => {
		this.setState({focused: true});
		triggerParentComponent("onFocus", e, this.props.inputProps);
	}

	onBlur = (e) => {
		this.setState({focused: false}, () => {
			this._valueForBlurAndFetch = this.state.inputValue;
			this.afterBlurAndFetch(this.state.suggestions);
			triggerParentComponent("onBlur", e, this.props.inputProps);
		});
	}

	afterBlurAndFetch = (suggestions, callback) => {
		const {inputValue = ""} = this.state;
		const {_valueForBlurAndFetch = ""} = this;
		if (this.mounted
			&& (this.state.focused || this._valueForBlurAndFetch === undefined || this.state.isLoading)
			|| (this.props.controlledValue && _valueForBlurAndFetch !== this.state.inputValue)
		) {
			return;
		}
		const parsedInputValue = this.props.parseInputValue ? this.props.parseInputValue(inputValue) : inputValue;

		const {selectOnlyOne, selectOnlyNonMatchingBeforeUnsuggested = true, informalTaxonGroups, informalTaxonGroupsValue, allowNonsuggestedValue} = this.props;

		const exactMatch = this.findExactMatch(suggestions, parsedInputValue);
		const onlyOneMatch = selectOnlyOne ? this.findTheOnlyOneMatch(suggestions) : undefined;
		const nonMatching = selectOnlyNonMatchingBeforeUnsuggested ? this.findNonMatching(suggestions) : undefined;
		const valueDidntChangeAndHasInformalTaxonGroup = this.props.value === inputValue && informalTaxonGroups && informalTaxonGroupsValue && informalTaxonGroupsValue.length;

		if (this.highlightedSuggestionOnBlur) {
			this.selectSuggestion(this.highlightedSuggestionOnBlur);
		} else if (onlyOneMatch) {
			this.selectSuggestion(onlyOneMatch);
		}	else if (exactMatch) {
			this.selectSuggestion({...exactMatch, value: inputValue});
		}	else if (nonMatching && !valueDidntChangeAndHasInformalTaxonGroup) {
			this.selectSuggestion(nonMatching);
		} else if (!valueDidntChangeAndHasInformalTaxonGroup && allowNonsuggestedValue) {
			this.selectUnsuggested(parsedInputValue);
		} else if (!allowNonsuggestedValue) {
			this.setState({inputValue: ""}, () => this.props.onChange && this.props.onChange(""));
		}

		callback && callback();
	}

	render() {
		const {props} = this;
		let {suggestions, inputValue = ""} = this.state;

		const inputProps = {
			id: this.props.id,
			value: inputValue,
			readonly: props.readonly,
			disabled: props.disabled,
			placeholder: props.placeholder,
			...(this.props.inputProps || {}),
			onChange: this.onInputChange,
			onBlur: this.onBlur,
			onFocus: this.onFocus,
		};

		let cssClasses = {
			suggestionsContainer: "rw-popup-container rw-popup-transition",
			suggestionsContainerOpen: "rw-popup",
			suggestionsList: "rw-list",
			suggestion: "rw-list-option",
			suggestionHighlighted: "rw-list-option rw-state-focus rw-state-selected"
		};

		const highlightFirstSuggestion = "highlightFirstSuggestion" in this.props
			? this.props.highlightFirstSuggestion
			: !this.props.allowNonsuggestedValue;

		const {renderExtra} = props;

		return (
			<React.Fragment>
				{renderExtra && renderExtra()}
				<div className={classNames("autosuggest-wrapper", props.wrapperClassName)}>
					<ReactAutosuggest
						id={`${this.props.id}-autosuggest`}
						inputProps={inputProps}
						renderInputComponent={this.renderInput}
						suggestions={suggestions}
						renderSuggestion={this.renderSuggestion}
						onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
						onSuggestionsClearRequested={this.onSuggestionsClearRequested}
						onSuggestionSelected={this.onSuggestionSelected}
						onUnsuggestedSelected={this.onUnsuggestedSelected}
						highlightFirstSuggestion={highlightFirstSuggestion}
						theme={cssClasses}
						formContext={this.props.formContext}
						ref={this.setRef}
					/>
				</div>
			</React.Fragment>
		);
	}

	setRef = (elem) => {
		this.autosuggestRef = elem;
	}

	onInformalTaxonGroupsOpened = (open) => {
		this.setState({informalTaxonGroupsOpen: open});
	}

	onInformalTaxonGroupSelected = (id) => {
		this.setState({informalTaxonGroupsOpen: false});
		this.props.onInformalTaxonGroupSelected && this.props.onInformalTaxonGroupSelected(id);
	}

	onInformalTaxonGroupHide = () => {
		this.setState({informalTaxonGroupsOpen: false});
	}

	onToggle = () => {
		if (!this.mounted) return;
		this.props.onToggle(!this.props.toggled);
		setTimeout(() => focusById(this.props.formContext, this.props.id), 1); // Refocus input
	}

	renderInput = (inputProps) => {
		let {value, renderSuccessGlyph, renderSuggested, renderUnsuggested, informalTaxonGroups, renderInformalTaxonGroupSelector = true, taxonGroupID, onToggle, displayValidationState = true} = this.props;
		let validationState = null;
		const {translations, lang} = this.props.formContext;
		const {suggestion} = this.state;

		const isSuggested = !!suggestion && this.isValueSuggested(this.props);

		if (displayValidationState && !isEmptyString(value) && isSuggested !== undefined) {
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
			if (!displayValidationState) {
				return null;
			}

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

		const {inputValue = ""} = this.state;
		const input = (
			<FetcherInput 
				value={inputValue}
				glyph={glyph} 
				loading={this.state.isLoading} 
				validationState={validationState} 
				extra={addon}
				appendExtra={toggler}
				className={toggler && this.state.focused ? "has-toggler" : undefined}
				{...inputProps} 
			/>
		);

		let component = input;
		if (displayValidationState) {
			if (value && isSuggested && renderSuggested) {
				component = renderSuggested(input, suggestion);
			} else if (value && isSuggested === false && renderUnsuggested) {
				component = renderUnsuggested(input);
			}
		}
		if (informalTaxonGroups) {
			component = (
				<div>
					{component}
					{this.state.informalTaxonGroupsOpen && <InformalTaxonGroupChooser modal={true} onHide={this.onInformalTaxonGroupHide} onSelected={this.onInformalTaxonGroupSelected} formContext={this.props.formContext} lang={lang} />}
				</div>
			);
		}
		return component;
	}
}

class TaxonCardOverlay extends React.Component {
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
			this.props.formContext.apiClient.fetchCached(`/taxa/${value}`).then(({scientificName, cursiveName, vernacularName, taxonRank, informalTaxonGroups, finnish}) => {
				if (!this.mounted) return;
				this.setState({value, taxonRank, informalTaxonGroups, taxon: {scientificName, vernacularName, cursiveName, finnish}});

				getInformalGroups(this.props.formContext.apiClient).then(({informalTaxonGroupsById}) => {
					if (!this.mounted) return;
					this.setState({informalTaxonGroupsById});
				});
			});
			this.props.formContext.apiClient.fetchCached(`/taxa/${value}/parents`).then(parents => {
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
			this.props.formContext.apiClient.fetchCached("/metadata/ranges/MX.taxonRankEnum").then(taxonRanks => {
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

		const popover = (
			<Popover id={`${id}-popover`}>
				<div className={`laji-form taxon-popover informal-group-image ${imageID}`}>
					<div>
						<OverlayTrigger overlay={tooltipElem}>
							<a href={`http://tun.fi/${value}`} target="_blank" rel="noopener noreferrer">
								<TaxonName {...taxon} /><br />
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

class InformalTaxonGroupsAddon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.mounted = true;
		getInformalGroups(this.props.formContext.apiClient).then(({informalTaxonGroupsById}) => {
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

class TaxonImgChooser extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount(){
		this.mounted = true;
		this.props.formContext.apiClient.fetchCached(`/taxa/${this.props.id}`, {includeMedia: true}).then(taxon => {
			if (!this.mounted) return;

			if (taxon.multimedia && taxon.multimedia.length) {
				const [media] = taxon.multimedia;
				this.setState({
					taxon: taxon,
					thumbnail: this.props.url || media.squareThumbnailURL || media.thumbnailURL,
					large: this.props.url || media.largeURL
				});
			} else {
				this.setState({taxon});
			}
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	showModal = () => {
		this.setState({modal: true});
	}

	hideModal = () => {
		this.setState({modal: false});
	}

	onSelected = () => {
		this.props.onSelect(this.props.id, this.state.taxon);
		this.hideModal();
	}

	render() {
		const {thumbnail, taxon, modal} = this.state;

		const {translations} = this.props.formContext;
		return (
			<div className="laji-form-medias">
				<div className="taxon-img media-container interactive" style={{backgroundImage: `url(${thumbnail})`}} onClick={this.showModal} tabIndex={0}>
					{!taxon && <div className="media-loading"><Spinner /></div>}
					<span>
						{taxon && taxon.vernacularName || ""}
					</span>
				</div>
				{modal && 
						<Modal dialogClassName="laji-form media-modal" show={true} onHide={this.hideModal}>
							<Modal.Body>
								<img src={this.state.large} />
								<div>
									<h3 className="text-center"><TaxonName {...this.state.taxon} finnish={false} /></h3>
									<Button block onClick={this.onSelected}>{translations.Select}</Button>
									<Button block onClick={this.hideModal}>{translations.Cancel}</Button>
								</div>
							</Modal.Body>
						</Modal>
				}
			</div>
		);
	}
}

const TaxonName = ({scientificName, vernacularName = "", cursiveName, finnish}) => {
	const _scientificName = vernacularName && scientificName
		?  `(${scientificName})`
		: (scientificName || "");
	return (
		<React.Fragment>
			{`${vernacularName}${vernacularName ? " " : ""}`}
			{cursiveName ? <i>{_scientificName}</i> : _scientificName}
			{renderFlag({payload: {finnish}}, " ")}
		</React.Fragment>
	);
};

class ReactAutosuggest extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			inputValue: props.inputProps.value
		};
	}

	componentWillReceiveProps(props) {
		if ("value" in props.inputProps) {
			this.setState({inputValue: props.inputProps.value});
		}
	}

	render() {
		return (
			<div onFocus={this.onContainerFocus} onBlur={this.onContainerBlur}>
				{this.renderInput()}
				{this.renderSuggestions()}
			</div>
		);
	}

	onInputFocus = (e) => {
		this.setState({focused: true, hideSuggestions: false});
		this.requestFetch(this.state.inputValue);
		this.props.inputProps && this.props.inputProps.onFocus && this.props.inputProps.onFocus(e);
	}

	onInputTryBlur = (e) => {
		if (this.suggestionMouseDownFlag) {
			return;
		}
		this.onBlur(e);
	}

	onBlur(e) {
		const suggestion = (this.props.suggestions || [])[this.state.focusedIdx];
		suggestion && this.onSuggestionSelected(this.props.suggestions[this.state.focusedIdx]);
		this.setState({focused: false, focusedIdx: undefined});
		this.props.inputProps && this.props.inputProps.onBlur && this.props.inputProps.onBlur(e);
	}

	onInputKeyDown = (e) => {
		let state, suggestion;
		const context = new Context(this.props.formContext.contextId);
		const {shortcuts = {}} = context;
		switch (e.key) {
		case "ArrowDown":
			e.preventDefault();
			if (this.state.focusedIdx >= (this.props.suggestions || []).length - 1) {
				break;
			}
			state = {
				focusedIdx: typeof this.state.focusedIdx === "number"
					? this.state.focusedIdx + 1
					: (this.props.suggestions || []).length
						? 0
						: undefined
			};
			if (state.focusedIdx !== undefined) {
				state.inputValue = this.props.suggestions[state.focusedIdx].value;
			}
			this.setState(state);
			break;
		case "ArrowUp":
			e.preventDefault();
			state = {focusedIdx: this.state.focusedIdx > 0 ? this.state.focusedIdx - 1 : undefined};
			if (state.focusedIdx !== undefined) {
				state.inputValue = this.props.suggestions[state.focusedIdx].value;
			}
			this.setState(state);
			break;
		case "Enter":
			e.preventDefault();
			suggestion = (this.props.suggestions || [])[this.state.focusedIdx];
			if (shortcuts.Enter) {
				context.setTimeout(() => {
					suggestion && this.onSuggestionSelected(suggestion);
				}, 0);
			} else {
				this.inputElem.blur();
			}
			break;
		}
		this.props.inputProps && this.props.inputProps.onKeyDown && this.props.inputProps.onKeyDown(e);
	}

	onInputChange = (e) => {
		this._onInputChange(e.target.value, "keystroke");
	}

	_onInputChange = (value, reason) => {
		const callback = reason === "click"
			? () => {}
			: () => this.requestFetch(this.state.inputValue);
		this.props.inputProps && this.props.inputProps.onChange
			? this.props.inputProps.onChange({target: {value}}, reason, callback)
			: this.setState({inputValue: value}, callback);
	}

	setInputRef = (elem) => {
		this.inputElem = elem;
	}

	renderInput() {
		const {inputProps, renderInputComponent = this.renderDefaultInputComponent} = this.props;
		return renderInputComponent({
			...inputProps,
			value: this.state.inputValue,
			onChange: this.onInputChange,
			onFocus: this.onInputFocus,
			onBlur: this.onInputTryBlur,
			onKeyDown: this.onInputKeyDown,
			ref: this.setInputRef
		});
	}

	renderDefaultInputComponent(props) {
		return <input {...props} />;
	}

	renderSuggestions() {
		if (!this.state.focused || this.state.hideSuggestions || !(this.props.suggestions || []).length) {
			return null;
		}
		const {suggestion, suggestionsList, suggestionsContainer, suggestionsContainerOpen, suggestionHighlighted} = this.props.theme || {};
		return (
			<div className={classNames(suggestionsContainer, suggestionsContainerOpen)}>
				<ul className={suggestionsList} tabIndex={-1}>
					{this.props.suggestions.map((s, i) =>
						<li key={i}
						    className={classNames(suggestion, this.state.focusedIdx === i && suggestionHighlighted)}
						    onMouseDown={this.onSuggestionMouseDown}
						    onMouseUp={this.onSuggestionMouseUp}
						    data-idx={i}
						>{this.props.renderSuggestion(s)}</li>
					)}
				</ul>
			</div>
		);
	}

	onSuggestionMouseDown = () => {
		this.suggestionMouseDownFlag = true;
	}

	onSuggestionMouseUp = (e) => {
		this.suggestionMouseDownFlag = false;
		const suggestion = this.getSuggestionFromClick(e);
		this.setState({inputValue: suggestion.value}, () => {
			this._onInputChange(suggestion.value, "click");
			this.onBlur();
		});
	}

	getSuggestionFromClick = ({target}) => {
		let idx;
		while (typeof idx !== "string") {
			idx = target.getAttribute("data-idx");
			target = target.parentElement;
		}
		return this.props.suggestions[idx];
	}

	onSuggestionSelected(suggestion) {
		this.setState({inputValue: suggestion.value, hideSuggestions: true});
		this.props.onSuggestionSelected && this.props.onSuggestionSelected(suggestion);
	}

	requestFetch(value) {
		this.props.onSuggestionsFetchRequested({value});
	}
}
