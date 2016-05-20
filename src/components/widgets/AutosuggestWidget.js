import React, { Component, PropTypes } from "react";
import Autosuggest from "react-autosuggest";
import ApiClient from "../../apiClient";

export default class AutosuggestWidget extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false
	}

	constructor(props) {
		super(props);
		this.state = {isLoading: false, suggestions: []};
		this.apiClient = new ApiClient();
	}

	getSuggestionValue = (suggestion) => {
		return suggestion.value;
	}

	renderSuggestion =(suggestion) => {
		return (<span>{suggestion.value}</span>);
	}

	onSuggestionsUpdateRequested = (suggestionValue) => {
		if (!suggestionValue || suggestionValue.value.length < 2) return;
		this.setState({isLoading: true});
		this.apiClient.fetch("/autocomplete/taxon", {q: suggestionValue.value, include_payload: true})
			.then((suggestions) => {
				this.setState({suggestions, isLoading: false});
			}).catch((error) => {
				this.setState({isLoading: false});
		});
	}

	onChange = (value) => {
		this.props.onChange(value);
	}

	// Unfortunately SchemaFields/Widgets don't pass extra props,
	// so we must use the existing onChange prop for delivering the changes.
	onSuggestionSelected = (e, {suggestion}) => {
		this.props.onChange(suggestion);
	}

	render() {
		let {readonly, value} = this.props;
		let {suggestions} = this.state;

		const inputProps = {...this.props,
			value: (value !== undefined) ? value : "",
			onChange: (e, {newValue}) => {this.onChange(newValue)},
			readOnly: readonly};

		return (
			<Autosuggest
				inputProps={inputProps}
				suggestions={suggestions}
				getSuggestionValue={this.getSuggestionValue}
				renderSuggestion={this.renderSuggestion}
				onSuggestionsUpdateRequested={this.onSuggestionsUpdateRequested}
				onSuggestionSelected={this.onSuggestionSelected}
			/>
		);
	}
}
