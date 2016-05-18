import React, { Component, PropTypes } from "react";
import Autosuggest from "react-autosuggest";

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
	}

	getSuggestionValue = (suggestion) => {
		return suggestion.key;
	}

	renderSuggestion =(suggestion) => {
		return (<span>{suggestion.value}</span>)
	}

	onSuggestionsUpdateRequested = (suggestionValue) => {
		this.setState({isLoading: true});
		setTimeout(() => {
			this.setState({suggestions: [
				{key: "MY.kantarelli", value: "kantarelli", payload: {type: "string"}},
				{key: "MY.korvasieni", value: "korvasieni", payload: {type: "string"}}
			],
				isLoading: false});
		}, 1000);
	}

	onChange = (value) => {
		this.props.onChange(value);
	}

	render() {
		let {readonly, value} = this.props;
		let {suggestions} = this.state;
		value = typeof value === "undefined" ? "" : value;

		const inputProps = {...this.props, value, onChange: (e, {newValue}) => {this.onChange(newValue)}, readOnly: readonly};

		return (
			<Autosuggest
				inputProps={inputProps}
				suggestions={suggestions}
				getSuggestionValue={this.getSuggestionValue}
			  renderSuggestion={this.renderSuggestion}
				onSuggestionsUpdateRequested={this.onSuggestionsUpdateRequested}
			/>
		);
	}
}
