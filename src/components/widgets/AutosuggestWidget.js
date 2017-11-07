import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactAutosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import { Tooltip, OverlayTrigger, Glyphicon, Popover } from "react-bootstrap";
import Spinner from "react-spinner";
import { getUiOptions, isEmptyString, focusNextInput } from "../../utils";
import { FetcherInput } from "../components";
import BaseComponent from "../BaseComponent";
import Context from "../../Context";

@BaseComponent
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

class TaxonCardOverlay extends Component {
	constructor(props) {
		super(props);
		this.state = {converted: false};
	}

	componentWillMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}
	componentWillReceiveProps({value}) {
		let urlTxt = "", urlTxtIsCursive = false;
		isEmptyString(value) ? 
			this.setState({urlTxt, urlTxtIsCursive}) :
			new ApiClient().fetchCached(`/taxa/${value}`).then(response => {
				this.mounted && this.setState({urlTxt: response.scientificName, value, urlTxtIsCursive: response.cursiveName});
			});
	}

	render() {
		const {id, formContext, value, children, placement} = this.props;
		const {urlTxt, urlTxtIsCursive} = this.state;

		const tooltipElem = (
			<Tooltip id={`${id}-popover-tooltip`}>
				{formContext.translations.OpenSpeciedCard}
			</Tooltip>
		);


		let popoverMouseIn = false;
		const popoverMouseOver = () => {
			popoverMouseIn = true;
		};
		let popoverTimeout = undefined;
		const popoverMouseOut = () => {
			popoverMouseIn = false;
			if (popoverTimeout) {
				clearTimeout(overlayTimeout);
			}
			popoverTimeout = new Context(formContext.contextId).setTimeout(() => {
				if (!popoverMouseIn && !overlayMouseIn && overlayRef) overlayRef.hide();
			}, 200);
		};

		const popover = (
			<Popover id={`${id}-popover`} onMouseOver={popoverMouseOver} onMouseOut={popoverMouseOut}>
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

		let overlayRef = undefined;
		const getOverlayRef = elem => {
			overlayRef = elem;
		};
		let overlayMouseIn = undefined;
		const overlayMouseOver = () => {
			overlayMouseIn = true;
			overlayRef.show();
		};
		let overlayTimeout = undefined;
		const overlayMouseOut = () => {
			overlayMouseIn = false;
			if (overlayTimeout) {
				clearTimeout(overlayTimeout);
			}
			overlayTimeout = new Context(formContext.contextId).setTimeout(() => {
				if (!popoverMouseIn && !overlayMouseIn && overlayRef) overlayRef.hide();
			}, 200);
		};

		return (
			<div onMouseOver={overlayMouseOver} onMouseOut={overlayMouseOut}>
				<OverlayTrigger delay={1}
				                trigger={[]} 
				                placement={placement || "top"}
												ref={getOverlayRef}
				                overlay={popover}>
					{children}
				</OverlayTrigger>
			</div>
		);

	}
}

class TaxonAutosuggestWidget extends Component {
	convertInputValue = (value) => {
		const {inputValue} = getUiOptions(this.props);
		if (inputValue) return new Promise(resolve => resolve(inputValue));
		else {
			return new ApiClient().fetchCached(`/taxa/${value}`).then(({vernacularName, scientificName}) => {
				return vernacularName || scientificName || value;
			});
		}
	}

	isValueSuggested = (value) => {
		return !isEmptyString(value) && value.match(/MX\.\d+/);
	}
	
	renderUnsuggested = (props) => (input) => {
		const tooltip = (
			<Tooltip id={`${props.id}-tooltip`}>{props.formContext.translations.UnknownSpeciesName}</Tooltip>
		);
		return (
			<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
		);
	}

	renderSuggested = (input) => {
		const options = getUiOptions(this.props);
		const value = "value" in options ? options.value : this.props.value;
		return (
			<TaxonCardOverlay value={value} formContext={this.props.formContext} id={this.props.id} trigger="hover">
				{input}
			</TaxonCardOverlay>
		);
	}

	renderSuccessGlyph = (value) => {
		return (
			<a href={"http://tun.fi/" + value} target="_blank" rel="noopener noreferrer">
				<Glyphicon style={{pointerEvents: "auto"}} glyph="tag" className="form-control-feedback"/>
			</a>
		);
	}

	render() {
		const {props} = this;

		const {options: propsOptions, ...propsWithoutOptions} = props;

		const options = {
			convertInputValue: this.convertInputValue,
			isValueSuggested: this.isValueSuggested,
			renderSuggested: this.renderSuggested,
			renderUnsuggested: this.renderUnsuggested(props),
			renderSuccessGlyph: this.renderSuccessGlyph,
			query: {...propsOptions.queryOptions}
		};

		return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
	}
}

function FriendsAutosuggestWidget(props) {
	const {options: propsOptions, ...propsWithoutOptions} = props;

	const options = {
		query: {
			includeSelf: true,
			...propsOptions.queryOptions
		},
		convertInputValue: (value) => {
			if (isEmptyString(value) || !value.match(/MA\.\d+/)) return new Promise(resolve => resolve(value));
			return new ApiClient().fetchCached(`/person/by-id/${value}`).then(({fullName}) => {
				return fullName || value;
			});
		},
		isValueSuggested: (value) => {
			return !isEmptyString(value) && value.match(/MA\.\d+/);
		},
		renderUnsuggested: (input) => {
			const tooltip = (
				<Tooltip id={`${props.id}-tooltip`}>{props.formContext.translations.UnknownName}</Tooltip>
			);
			return (
				<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
			);
		},
		renderSuccessGlyph: () => <Glyphicon style={{pointerEvents: "auto"}}
		                                         glyph="user"
		                                         className="form-control-feedback"/>,
	};

	return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
}

@BaseComponent
export class Autosuggest extends Component {
	static propTypes = {
		autosuggestField: PropTypes.string,
		allowNonsuggestedValue: PropTypes.bool,
		onSuggestionSelected: PropTypes.func,
		onConfirmUnsuggested: PropTypes.func,
		onInputChange: PropTypes.func,
		uiSchema: PropTypes.object
	}

	static defaultProps = {
		allowNonsuggestedValue: true,
	}

	constructor(props) {
		super(props);
		this.state = {isLoading: false, suggestions: [], unsuggested: false, focused: false, ...this.getStateFromProps(props)};
		this.apiClient = new ApiClient();
	}

	componentWillReceiveProps(props) {
		const prevValue = this.state.value;
		this.setState(this.getStateFromProps(props), () => {
			if (props.value !== prevValue) this.triggerConvert(props);
		});
	}

	getStateFromProps(props) {
		return {value: props.value};
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	triggerConvert = (props) => {
		let {isValueSuggested, value, convertInputValue: convert} = props;

		if (isEmptyString(value)) {
			this.setState({inputValue: undefined});
			return;
		}

		if ((isValueSuggested && isValueSuggested(value) && convert) || (!isValueSuggested && convert)) {
			this.setState({isLoading: true});
			convert(value)
				.then(inputValue => {
					if (!this.mounted) return;
					this.setState({inputValue: inputValue, isLoading: false});
				})
				.catch(() => {
					if (!this.mounted) return;
					this.setState({inputValue: undefined, isLoading: false, unsuggested: true});
				});
		} else if (isValueSuggested) {
			if (!isValueSuggested()) this.setState({unsuggested: true});
		}
	}

	getSuggestionValue = (suggestion) => {
		return suggestion.value;
	}

	renderSuggestion = (suggestion) => {
		let renderSuggestion = this.props.renderSuggestion;
		if (!renderSuggestion) renderSuggestion = suggestion => suggestion.value;
		return (<span className="simple-option">{renderSuggestion(suggestion)}</span>);
	}

	onSuggestionsFetchRequested = ({value}) => {
		value = this.inputValue;
		if (!value || value.length < 2) return;
		const {autosuggestField, query = {}} = this.props;

		this.setState({isLoading: true});

		const request = () => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			this.get = this.apiClient.fetchCached("/autocomplete/" + autosuggestField,
				{q: value, includePayload: true, ...query})
				.then(suggestions => {
					const state = {isLoading: false};
					if (this.mounted && this.promiseTimestamp === timestamp) {
						const exactMatch = this.findExactMatch(suggestions);
						if (!this.state.focused && exactMatch) {
							this.selectSuggestion({...exactMatch, value});
						}
						else if (this.state.focused) state.suggestions = suggestions;
						else state.oldSuggestions = suggestions;
						this.setState(state);
						this.promiseTimestamp = undefined;
					}
				})
				.catch(() => {
					if (this.mounted && this.promiseTimestamp === timestamp) {
						this.setState({isLoading: false});
						this.promiseTimestamp = undefined;
						this.onSuggestionsClearRequested();
					}
				});
		};

		const context = new Context(this.props.formContext.contextId);
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.timeout = context.setTimeout(request, 400);
	}

	onSuggestionsClearRequested = () => {
		this.setState({oldSuggestions: this.state.suggestions.slice(0), suggestions: []});
	}

	selectSuggestion = (suggestion) => {
		if (!suggestion) return;
		const {onSuggestionSelected} = this.props;
		this.suggestionSelectedFlag = true;
		let state = {inputInProgress: false, unsuggested: false, inputValue: (suggestion !== undefined && suggestion !== null) ? suggestion.value : ""};
		if (onSuggestionSelected) {
			onSuggestionSelected(suggestion);
		}
		const callback = onSuggestionSelected ? undefined : () => {
			this.props.onChange(suggestion[this.props.suggestionReceive || "key"]);
		};
		this.setState(state, callback);
	}

	onSuggestionSelected = (e, {suggestion, method}) => {
		e.preventDefault();
		if (method === "click") {
			if ("id" in this.props) focusNextInput(this.props.formContext.getFormRef(), document.getElementById(this.props.id));
		}
		this.selectSuggestion(suggestion);
		this.setState({focused: false});
	}

	onInputChange = (value, method) => {
		const {onInputChange, preventTypingPattern} = this.props;

		if (onInputChange) {
			value = onInputChange(value);
		}

		this.inputChanged = (value !== this.state.inputValue);
		if (this.inputChanged && !this.suggestionSelectedFlag) {
			if (method === "type" && preventTypingPattern)  {
				const regexp = new RegExp(preventTypingPattern);
				if (value.match(regexp)) return;
			}

			const state = {inputValue: value};
			if (value !== "") state.inputInProgress = true;
			this.setState(state);
			this.inputValue = value; //setState works asynchronously. We need the input value immediately for suggestion fetching.
		}
		this.suggestionSelectedFlag = false;
	}

	onFocus =  () => {
		this.setState({focused: true});
	}

	findExactMatch = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		return suggestions.find(suggestion => (suggestion && suggestion.payload && suggestion.payload.matchType === "exactMatches"));
	}

	onBlur = (e, {highlightedSuggestion}) => {
		if (this.state.inputValue === "") {
			this.setState({unsuggested: false}, () => {
				this.props.onChange("");
			});
			return;
		}

		const exactMatch = this.findExactMatch(this.state.suggestions);
		this.setState({focused: false}, () => {
			if (!this.state.inputInProgress) {
				return;
			} else if (highlightedSuggestion === null && this.state.inputValue === "") {
				this.selectSuggestion(highlightedSuggestion);
			} else if (exactMatch) {
				this.selectSuggestion({...exactMatch, value: this.state.inputValue});
			} else {
				this.onConfirmUnsuggested();
			}
		});
	}

	onConfirmUnsuggested = () => {
		const {onConfirmUnsuggested, allowNonsuggestedValue} = this.props;
		if (!allowNonsuggestedValue) return;
		this.setState({inputInProgress: false, unsuggested: true});
		if (onConfirmUnsuggested) {
			onConfirmUnsuggested(this.state.inputValue);
		} else if  (this.props.onChange) {
			this.props.onChange(this.state.inputValue);
		}
	}

	componentDidUpdate() {
		this.suggestionSelectedFlag = false;
	}

	render() {
		const {props} = this;
		let {suggestions, inputValue} = this.state;

		const inputProps = {
			id: this.props.id,
			value: (inputValue !== undefined) ? inputValue : props.value,
			readOnly: props.readonly,
			disabled: props.disabled,
			placeholder: props.placeholder,
			onChange: (e, {newValue, method}) => this.onInputChange(newValue, method),
			onFocus: this.onFocus,
			onBlur: this.onBlur
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
			<div className="autosuggest-wrapper">
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

	renderInput = (inputProps) => {
		let validationState = null;

		const value = this.props.value;

		if ((this.state.inputInProgress && !this.state.focused) || this.state.unsuggested) {
			validationState = "warning";
		} else if (value) {
			validationState = "success";
		}

		let renderSuggested = this.props.renderSuggested;

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
					style={{pointerEvents: "auto"}}
					glyph={glyph}
					className="form-control-feedback"
				/>
			) : null;
		};

		// react-bootstrap components can't be used here because they require using form-group which breaks layout.
		let glyph = undefined;
		let {renderSuccessGlyph, renderUnsuggested} = this.props;

		if (!this.state.focused && !this.state.isLoading) {
			glyph = (validationState === "success" && renderSuccessGlyph) ?
				renderSuccessGlyph(value) : getGlyph(validationState);
		}
		const input = (
			<FetcherInput 
				{...inputProps} 
				glyph={glyph} 
				loading={this.state.isLoading} 
				validationState={validationState} 
			/>
		);

		if (value && !this.state.unsuggested && renderSuggested) {
			return renderSuggested(input);
		} else if (value && this.state.unsuggested && renderUnsuggested) {
			return renderUnsuggested(input);
		} else {
			return input;
		}
	}
}

