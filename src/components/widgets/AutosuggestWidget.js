import React, { Component, PropTypes } from "react";
import Autosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import InputMetaInfo from "../InputMetaInfo";
import { Button } from "react-bootstrap";

const autosuggestFieldSettings = {
	taxon: {
		includePayload: true,
		render: suggestion => {
			let text = suggestion.value;
			if (suggestion.payload.taxonGroupsStr) {
				text += " (" + suggestion.payload.taxonGroupsStr + ")";
			}
			return text;
		},
		convertInputValue: that => {
			return new Promise((resolve) => {resolve(that.state.options.parentData.informalNameString)});
		}
	},
	friends: {
		includePayload: false,
		render: suggestion => {
			return suggestion.value;
		},
		convertInputValue: that => {
			let inputValue = that.props.value;
			return new ApiClient().fetch("/person/by-id/" + inputValue).then((response) => {
				return response.inheritedName + ", " + response.preferredName;
			});
		}
	}
}

/**
 * uischema = {"ui:options": {
 *  autosuggestField: <string> (field name which is used for api call. The suggestions renderer method is also defined by autosuggestField)
 *  suggestionInputField: <fieldName> (the field which uses autosuggest input)
 *  suggestionReceivers: {
 *    <fieldName>: <suggestion path>,     (when an autosuggestion is selected, these fields receive the autosuggestions value defined by suggestion path.
 *    <fieldName2>: <suggestion path 2>,   Example: autosuggestion = {key: "MLV.2", value: "kalalokki", payload: {informalGroups: ["linnut"]}}
 *   }                                              suggestionReceivers: {someFieldName: "key", someFieldName2: "payload.informalgroups.0}
 *  uiSchema: <uiSchema> (uiSchema which is passed to inner SchemaField)
 * }
 */
export default class AutoSuggestWidget extends Component {
	constructor(props) {
		super(props);
		this.state = {isLoading: false, suggestions: [], ...this.getStateFromProps(props)};
		this.apiClient = new ApiClient();
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props), () => {
			if (this.state && props.value !== this.state.inputValue) this.triggerConvert(props);
		});
	}

	getStateFromProps = (props) => {
		let autosuggestSettings = autosuggestFieldSettings[props.options.autosuggestField];
		return {autosuggestSettings};
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	triggerConvert = (props) => {
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
					this.setState({isLoading: false, inputValue: undefined, origValue: undefined});
				});
		}
	}

	getSuggestionValue = (suggestion) => {
		return suggestion.value;
	}

	renderSuggestion = (suggestion) => {
		return (<span>{this.state.autosuggestSettings.render(suggestion)}</span>);
	}

	onSuggestionsUpdateRequested = (suggestionValue) => {
		if (!suggestionValue || suggestionValue.value.length < 2) return;

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
		if (this.props.options.onSuggestionSelected) {
			this.setState({inputInProgress: false});
			this.props.options.onSuggestionSelected(suggestion);
		} else {
			this.setState({inputValue: suggestion.value, inputInProgress: false});
			this.props.onChange(suggestion.key);
		}
	}

	onInputChange = (value, method) => {
		this.setState({inputValue: value, inputInProgress: true});

		//if (method === "type" && this.props.options.allowNonsuggestedValue) {
		//	this.props.onChange(value);
		//}
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
		this.setState({inputInProgress: false});
		this.props.onChange(this.state.inputValue);
	}

	render() {
		let {readonly} = this.props;
		let {suggestions, inputValue} = this.state;

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

		if (this.state.isLoading) cssClasses.container = "autosuggest-loading";

		const translations = this.props.registry.translations;
		return (
			<div>
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
				{(!this.state.focused && this.state.inputInProgress) ? <InputMetaInfo>{
					<div className="text-danger">
						<Button bsStyle="link" onClick={this.onFix}>{translations.Fix}</Button> <span>{translations.or}</span> <Button bsStyle="link" onClick={this.onConfirmUnsuggested}>{this.props.registry.translations.continue}</Button>
					</div>
				}</InputMetaInfo> : null}
			</div>
		);
	}
}

