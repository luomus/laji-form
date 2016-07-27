import React, { Component, PropTypes } from "react";
import Autosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import InputMetaInfo from "../InputMetaInfo";
import { Button } from "react-bootstrap";
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
					if (this.mounted && this.promiseTimestamp === timestamp) {
						this.setState({suggestions, isLoading: false});
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

	onSuggestionSelected = (e, {suggestion}) => {
		e.preventDefault();
		let state = {inputInProgress: false, unsuggested: false};
		if (this.props.options.onSuggestionSelected) {
			this.props.options.onSuggestionSelected(suggestion);
		} else {
			state.inputValue = suggestion.value;
			this.props.onChange(suggestion.key);
		}
		this.setState(state)
	}

	onInputChange = (value) => {
		if (this.props.options.onInputChange) {
			value = this.props.options.onInputChange(value);
		}
		if (value !== this.props.value) this.setState({inputValue: value, inputInProgress: true});
	}

	onFocus =  () => {
		this.setState({focused: true});
	}

	onBlur = () => {
		this.setState({focused: false});
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

	render() {
		let {readonly} = this.props;
		let {suggestions, inputValue, isLoading} = this.state;

		const inputProps = {...this.props,
			value: (inputValue !== undefined) ? inputValue : this.props.value,
			onChange: (e, {newValue, method}) => {
				if (method === "type" && this.props.options.preventTypingPattern) {
					const regexp = new RegExp(this.props.options.preventTypingPattern);
					if (newValue.match(regexp)) return;
				}
				this.onInputChange(newValue, method)
			},
			onFocus: this.onFocus,
			onBlur: this.onBlur,
			readOnly: readonly};

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
			const translations = this.props.registry.translations;
			return (
				<div className="text-danger">
					<Button bsStyle="link" onClick={this.onFix}>{translations.Fix}</Button> <span>{translations.or}</span> <Button
					bsStyle="link" onClick={this.onConfirmUnsuggested}>{this.props.registry.translations.continue}</Button>
				</div>
			);
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
}

