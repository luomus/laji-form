import React, { Component, PropTypes } from "react";
import Autosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import InputMetaInfo from "../InputMetaInfo";
import { Button, Tooltip, OverlayTrigger } from "react-bootstrap";
import Spinner from "react-spinner"

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
		renderUnsuggestedMetaInfo: that => {
			return <span className="text-danger">{that.props.registry.translations.UnknownSpeciesName}</span>
		},
		renderMetaInfoListItemAdditional: (that, suggestion) => {
			const tooltipElem = <Tooltip id={suggestion.key + "-tooltip"}>{that.props.registry.translations.openSpeciedCard}</Tooltip>;
			return (
				<OverlayTrigger overlay={tooltipElem}>
					<a href={"http://tun.fi/" + suggestion.key + "?locale=" + that.props.registry.lang} target="_blank">({suggestion.payload.scientificName})</a>
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
			return <span className="text-danger">{that.props.registry.translations.UnknownName}</span>
		},
		convertInputValue: that => {
			let inputValue = that.props.value;
			return new ApiClient().fetch("/person/by-id/" + inputValue).then((response) => {
				return response.inheritedName + ", " + response.preferredName;
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
		return {autosuggestSettings: autosuggestSettings[props.options.autosuggestField]};
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	triggerConvert = (props) => {
		if (props.value === undefined || props.value === "") return;
		const convert = this.state.autosuggestSettings.convertInputValue;
		if ((this.state.inputValue !== props.value) && convert) {
			let origValue = props.value;
			this.setState({isLoading: true});
			convert(this)
				.then( inputValue => {
					if (!this.mounted) return;
					this.setState({inputValue: inputValue, origValue: origValue, isLoading: false});
				})
				.catch( () => {
					if (!this.mounted) return;
					this.setState({inputValue: undefined, origValue: undefined, isLoading: false, unsuggested: true});
				});
		} else if (this.props.options.isValueSuggested) {
			if (!this.props.options.isValueSuggested()) this.setState({unsuggested: true});
		}
		
	}

	getSuggestionValue = (suggestion) => {
		return suggestion.value;
	}

	renderSuggestion = (suggestion) => {
		return (<span>{this.state.autosuggestSettings.renderSuggestion(suggestion)}</span>);
	}

	onSuggestionsUpdateRequested = (suggestionValue) => {
		if (!suggestionValue || suggestionValue.value.length < 2 || suggestionValue.reason !== "type") return;

		this.setState({isLoading: true});
		(() => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			this.get = this.apiClient.fetch("/autocomplete/" + this.props.options.autosuggestField, {q: suggestionValue.value, includePayload: this.state.autosuggestSettings.includePayload})
				.then( suggestions => {
					const state = {isLoading: false};
					if (this.mounted && this.promiseTimestamp === timestamp) {
						if (this.state.focused || (!this.state.focused && !this.selectUnambigious(suggestions))) state.suggestions = suggestions;
						this.setState(state);
						this.promiseTimestamp = undefined;
					}
				})
				.catch( error => {
					if (this.mounted && this.promiseTimestamp === timestamp) {
						this.setState({isLoading: false});
						this.promiseTimestamp = undefined;
					}
				});
		})();
	}

	selectSuggestion = (suggestion) => {
		let state = {inputInProgress: false, unsuggested: false, inputValue: suggestion.value};
		if (this.props.options.onSuggestionSelected) {
			this.props.options.onSuggestionSelected(suggestion);
		} else {
			this.props.onChange(suggestion.key);
		}
		this.setState(state)
	}

	selectUnambigious = (suggestions) => {
		if (suggestions && suggestions.length === 1 && suggestions[0].value === this.state.inputValue) {
			this.selectSuggestion(suggestions[0]);
			return true;
		}
		return false;
	}

	onSuggestionSelected = (e, {suggestion}) => {
		e.preventDefault();
		this.selectSuggestion(suggestion);
	}

	onInputChange = (value) => {
		if (this.props.options.onInputChange) {
			value = this.props.options.onInputChange(value);
		}
		if (value !== this.state.inputValue) this.setState({inputValue: value, inputInProgress: true});
	}

	onFocus =  () => {
		this.setState({focused: true});
	}

	onBlur = () => {
		this.setState({focused: false}, () => {
			this.selectUnambigious(this.state.suggestions);
		});
	}

	onFix = () => {
		this.refs.autosuggestInput.input.focus();
	}

	onConfirmUnsuggested = () => {
		this.setState({inputInProgress: false, unsuggested: true});
		if (this.props.options.onConfirmUnsuggested) {
			this.props.options.onConfirmUnsuggested(this.state.inputValue);
		} else {
			this.props.onChange(this.state.inputValue);
		}
	}

	onKeyDown = (event) => {
		const {suggestions} = this.state;
		if (event.key === "Enter" && suggestions && suggestions.length === 1) this.selectUnambigious(suggestions);
	}

	render() {
		const {props} = this;
		let {suggestions, inputValue, isLoading} = this.state;

		const inputProps = {
			value: (inputValue !== undefined) ? inputValue : props.value,
			readOnly: props.readonly,
			disabled: props.disabled,
			placeholder: props.disabled,
			onChange: (e, {newValue, method}) => {
				if (method === "type" && props.options.preventTypingPattern) {
					const regexp = new RegExp(props.options.preventTypingPattern);
					if (newValue.match(regexp)) return;
				}
				this.onInputChange(newValue, method)
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

		return (
			<div>
				<div className="autosuggest-wrapper">
					<Autosuggest
						ref="autosuggestInput"
						id={this.props.id}
						inputProps={inputProps}
						suggestions={suggestions}
						getSuggestionValue={this.getSuggestionValue}
						renderSuggestion={this.renderSuggestion}
						onSuggestionsUpdateRequested={this.onSuggestionsUpdateRequested}
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
			if (this.state.unsuggested && this.props.options.onRenderUnsuggestedMetaInfo) {
				return this.props.options.onRenderUnsuggestedMetaInfo();
			} else if (this.state.unsuggested && this.state.autosuggestSettings.renderUnsuggestedMetaInfo) {
				return this.state.autosuggestSettings.renderUnsuggestedMetaInfo(this);
			} else if (this.props.options.onRenderMetaInfo) {
				return this.props.options.onRenderMetaInfo();
			} else if (this.state.autosuggestSettings.renderMetaInfo) {
				return this.state.autosuggestSettings.renderMetaInfo(this);
			}
		}
		return null;
	}

	renderInprogressMetaInfo = () => {
		if (this.state.isLoading) return null;

		const translations = this.props.registry.translations;

		const suggestionsList = (this.state.suggestions && this.state.suggestions.length) ?
			(
				<ul>
					{this.state.suggestions.map(suggestion =>
							<li key={suggestion.key} >
								<Button bsStyle="link" onClick={() => this.selectSuggestion(suggestion)}>{suggestion.value}</Button>
								 {this.state.autosuggestSettings.renderMetaInfoListItemAdditional ? <span> {this.state.autosuggestSettings.renderMetaInfoListItemAdditional(this, suggestion)}</span> : null}
							</li>)
					}
				</ul>
			) : null;
		const fixButton = <Button bsStyle="link" onClick={this.onFix}>{translations.Fix}</Button>;
		const continueButton = <Button bsStyle="link" onClick={this.onConfirmUnsuggested}>{this.props.registry.translations.useUnknownName}</Button>;
		return (
			<div className="text-danger">
				{suggestionsList ? translations.PickOneOfTheFollowing : fixButton} <span>{translations.or}</span> {continueButton}
				{suggestionsList}
			</div>
		);
	}
}

