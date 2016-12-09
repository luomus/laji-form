import React, { Component, PropTypes } from "react";
import Autosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import { Button, Tooltip, OverlayTrigger } from "react-bootstrap";
import Spinner from "react-spinner"
import { getUiOptions } from "../../utils";

const autosuggestSettings = {
	taxon: {
		includePayload: true,
		renderSuggestion: suggestion => {
			let text = suggestion.value;
			if (suggestion.payload.taxonGroupsStr) {
				text += " (" + suggestion.payload.taxonGroupsStr + ")";
			}
			return text;
		},
		renderMetaInfo: that => {
			const options = getUiOptions(that.props);
			const value = options.hasOwnProperty("value") ? options.value : that.props.value;

			if (value && (!that.state || !that.state.value || that.state.value !== value)) {
				new ApiClient().fetch("/taxa/" + value).then(response => {
					if (that.mounted) that.setState({urlTxt: response.scientificName, value});
				});
			}

			const tooltipElem = (
				<Tooltip id={value + "-tooltip"}>
					{that.props.formContext.translations.openSpeciedCard}
				</Tooltip>
			);

			return (that.mounted && value) ? (
				<div>
					<div className="meta-info-taxon">
						<span className="text-success">{that.props.formContext.translations.KnownSpeciesName}</span>
						{that.state.urlTxt ?
							<div><OverlayTrigger overlay={tooltipElem}>
								<a href={"http://tun.fi/" + value}
									 target="_blank">{that.state.urlTxt}</a>
							</OverlayTrigger></div> : <Spinner />}
					</div>
				</div>
			) : null
		},
		renderUnsuggestedMetaInfo: that => {
			return <span className="text-danger">{that.props.formContext.translations.UnknownSpeciesName}</span>
		},
		renderMetaInfoListItemAdditional: (that, suggestion) => {
			const tooltipElem = <Tooltip id={suggestion.key + "-tooltip"}>{that.props.formContext.translations.openSpeciedCard}</Tooltip>;
			return (
				<OverlayTrigger overlay={tooltipElem}>
					<a href={"http://tun.fi/" + suggestion.key} target="_blank">({suggestion.payload.scientificName})</a>
				</OverlayTrigger>
			);
		}
	},
	friends: {
		includePayload: false,
		renderSuggestion: suggestion => {
			return suggestion.value;
		},
		renderUnsuggestedMetaInfo: that => {
			return <span className="text-danger">{that.props.formContext.translations.UnknownName}</span>
		},
		convertInputValue: that => {
			let inputValue = that.props.value;
			return new ApiClient().fetch("/person/by-id/" + inputValue).then(({fullName}) => {
				return fullName || inputValue;
			});
		}
	}
}

export default class AutoSuggestWidget extends Component {
	static propTypes = {
		options: PropTypes.shape({
			autosuggestField: PropTypes.string.isRequired,
			allowNonsuggestedValue: PropTypes.boolean,
			onSuggestionSelected: PropTypes.function,
			onConfirmUnsuggested: PropTypes.function,
			onInputChange: PropTypes.function,
			uiSchema: PropTypes.object
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {isLoading: false, suggestions: [], unsuggested: false, ...this.getStateFromProps(props)};
		this.apiClient = new ApiClient();
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const options = getUiOptions(props);
		const {autosuggestField} = options;


		return {autosuggestSettings: autosuggestSettings[autosuggestField]};
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	triggerConvert = (props) => {
		const {isValueSuggested} = getUiOptions(this.props);
		if (props.value === undefined || props.value === "") return;
		const convert = this.state.autosuggestSettings.convertInputValue;
		if ((this.state.inputValue !== props.value) && convert) {
			let origValue = props.value;
			this.setState({isLoading: true});
			convert(this)
				.then(inputValue => {
					if (!this.mounted) return;
					this.setState({inputValue: inputValue, origValue: origValue, isLoading: false});
				})
				.catch( () => {
					if (!this.mounted) return;
					this.setState({inputValue: undefined, origValue: undefined, isLoading: false, unsuggested: true});
				});
		} else if (isValueSuggested) {
			if (!isValueSuggested()) this.setState({unsuggested: true});
		}
	}

	getSuggestionValue = (suggestion) => {
		return suggestion.value;
	}

	renderSuggestion = (suggestion) => {
		return (<span>{this.state.autosuggestSettings.renderSuggestion(suggestion)}</span>);
	}

	onSuggestionsFetchRequested = ({value}) => {
		value = this.inputValue;
		if (!value || value.length < 2) return;
		const {autosuggestField} = getUiOptions(this.props);

		this.setState({isLoading: true});
		(() => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			this.get = this.apiClient.fetch("/autocomplete/" + autosuggestField,
				{q: value, includePayload: this.state.autosuggestSettings.includePayload})
				.then( suggestions => {
					const state = {isLoading: false};
					if (this.mounted && this.promiseTimestamp === timestamp) {
						const unambigiousSuggestion = this.findUnambigiousSuggestion(suggestions);
						if (!this.state.focused && unambigiousSuggestion) {
							this.selectSuggestion(unambigiousSuggestion);
						}
						else if (this.state.focused) state.suggestions = suggestions;
						else state.oldSuggestions = suggestions;
						this.setState(state);
						this.promiseTimestamp = undefined;
					}
				})
				.catch(error => {
					if (this.mounted && this.promiseTimestamp === timestamp) {
						this.setState({isLoading: false});
						this.promiseTimestamp = undefined;
					}
				});
		})();
	}

	onSuggestionsClearRequested = () => {
		this.setState({oldSuggestions: this.state.suggestions.slice(0), suggestions: []});
	}

	selectSuggestion = (suggestion) => {
		const {onSuggestionSelected} = getUiOptions(this.props);
		this.suggestionSelectedFlag = true;
		let state = {inputInProgress: false, unsuggested: false, inputValue: (suggestion !== undefined && suggestion !== null) ? suggestion.value : ""};
		if (onSuggestionSelected) {
			onSuggestionSelected(suggestion);
		} else {
			this.props.onChange(suggestion.key);
		}
		this.setState(state);
	}

	onSuggestionSelected = (e, {suggestion}) => {
		e.preventDefault();
		this.selectSuggestion(suggestion);
	}

	onInputChange = (value) => {
		const {onInputChange} = getUiOptions(this.props);
		if (onInputChange) {
			value = onInputChange(value);
		}
		this.inputChanged = (value !== this.state.inputValue);
		if (this.inputChanged && !this.suggestionSelectedFlag) {
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

	findUnambigiousSuggestion = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		return suggestions.find(suggestion => (suggestion && suggestion.value === this.state.inputValue));
	}

	onBlur = (e, {focusedSuggestion}) => {
		if (this.onTabBlur) {
			this.onTabBlur = false;
			return;
		}

		if (focusedSuggestion) {
			this.selectSuggestion(focusedSuggestion);
		} else {
			console.log(this.state.suggestions);
			const unambigiousSuggestion = this.findUnambigiousSuggestion(this.state.suggestions);
			if (unambigiousSuggestion) this.selectSuggestion(unambigiousSuggestion);
		}
		this.setState({focused: false}, () => {
		if (focusedSuggestion === null && this.state.inputValue === "") {
				this.selectSuggestion(focusedSuggestion);
			}
		});
	}

	onFix = () => {
		this.refs.autosuggestInput.input.focus();
	}

	onConfirmUnsuggested = () => {
		const {onConfirmUnsuggested} = getUiOptions(this.props);
		this.setState({inputInProgress: false, unsuggested: true});
		if (onConfirmUnsuggested) {
			onConfirmUnsuggested(this.state.inputValue);
		} else {
			this.props.onChange(this.state.inputValue);
		}
	}

	onKeyDown = (e) => {
		if (e.key === "Enter") {
			console.log(this.findUnambigiousSuggestion(this.state.suggestions));
			const unambigiousSuggestion = this.findUnambigiousSuggestion(this.state.suggestions);
			if (unambigiousSuggestion) this.selectSuggestion(unambigiousSuggestion);
		}
	}

	componentDidUpdate() {
		this.suggestionSelectedFlag = false;
	}

	render() {
		const {props} = this;
		let {suggestions, inputValue, isLoading} = this.state;
		const {preventTypingPattern} = getUiOptions(props);

		const inputProps = {
			id: this.props.id,
			value: (inputValue !== undefined) ? inputValue : props.value,
			readOnly: props.readonly,
			disabled: props.disabled,
			placeholder: props.placeholder,
			onChange: (e, {newValue, method}) => {
				if (method === "type" && preventTypingPattern) {
					const regexp = new RegExp(preventTypingPattern);
					if (newValue.match(regexp)) return;
				}
				this.onInputChange(newValue, method);
			},
			onFocus: this.onFocus,
			onBlur: this.onBlur,
			onKeyDown: this.onKeyDown
		};

		if (inputProps.value === undefined || inputProps.value === null) inputProps.value = "";

		let cssClasses = {
			input: "form-control",
			suggestionsContainer: "list-group autosuggest-container",
			suggestion: "list-group-item",
			suggestionFocused: "list-group-item active"
		};

		const InputMetaInfo = ({children, className}) => {
			return (<div className={"input-meta" + (className ? " " + className : "")}>{children}</div>)
		}

		return (
			<div>
				<div className="autosuggest-wrapper">
					<Autosuggest
						ref="autosuggestInput"
						id={`${this.props.id}-autosuggest`}
						inputProps={inputProps}
						suggestions={suggestions}
						getSuggestionValue={this.getSuggestionValue}
						renderSuggestion={this.renderSuggestion}
						onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
						onSuggestionsClearRequested={this.onSuggestionsClearRequested}
						onSuggestionSelected={this.onSuggestionSelected}
						theme={cssClasses}
					/>
					{isLoading ? <Spinner /> : null }
				</div>
				<InputMetaInfo>{this.renderMetaInfo()}</InputMetaInfo>
			</div>
		);
	}

	renderMetaInfo = () => {
		if (this.state.inputInProgress && !this.state.focused) {
			return this.renderInprogressMetaInfo();
		} else if (!this.state.inputInProgress) {
			if (this.state.unsuggested && this.state.autosuggestSettings.renderUnsuggestedMetaInfo) {
				return this.state.autosuggestSettings.renderUnsuggestedMetaInfo(this);
			} else if (this.state.autosuggestSettings.renderMetaInfo) {
				return this.state.autosuggestSettings.renderMetaInfo(this);
			}
		}
		return null;
	}

	renderInprogressMetaInfo = () => {
		if (this.state.isLoading) return null;

		const translations = this.props.formContext.translations;

		const suggestionsList = (this.state.oldSuggestions && this.state.oldSuggestions.length) ?
			(
				<ul>
					{this.state.oldSuggestions.map(suggestion =>
							<li key={suggestion.key} >
								<Button bsStyle="link" onClick={() => this.selectSuggestion(suggestion)}>{suggestion.value}</Button>
								 {this.state.autosuggestSettings.renderMetaInfoListItemAdditional ? <span> {this.state.autosuggestSettings.renderMetaInfoListItemAdditional(this, suggestion)}</span> : null}
							</li>)
					}
				</ul>
			) : null;
		const fixButton = <Button bsStyle="link" onClick={this.onFix}>{translations.Fix}</Button>;
		const continueButton = <Button bsStyle="link" onClick={this.onConfirmUnsuggested}>{this.props.formContext.translations.useUnknownName}</Button>;
		return (
			<div className="text-danger">
				{suggestionsList ? translations.SelectOneOfTheFollowing : fixButton} <span>{translations.or}</span> {continueButton}
				{suggestionsList}
			</div>
		);
	}
}

