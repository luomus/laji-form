import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import Autosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";

const autosuggestFieldSettings = {
	taxon: {
		includePayload: true,
		render: suggestion => {
			let text = suggestion.value;
			if (suggestion.payload.informalGroupsStr) {
				text += " (" + suggestion.payload.informalGroupsStr + ")";
			}
			return text;
		}
	},
	friends: {
		includePayload: false,
		render: suggestion => {
			return suggestion.value;
		}
	}
}

export default class AutosuggestField extends Component {

	constructor(props) {
		super(props);
		this.state = {
			onChange: this.onChange,
			onSuggestionSelected: this.onSuggestionSelected,
			...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {schema} = props;
		let propsUiSchema = props.uiSchema;
		let options = propsUiSchema["ui:options"];

		schema = update(schema, {});
		Object.keys(options.suggestionReceivers).forEach((fieldName) => {
			if (fieldName !== options.suggestionInputField) {
				delete schema.properties[fieldName];
			}
		});

		let uiSchema = options.uiSchema || {};
		uiSchema = update(uiSchema, {$merge: {[options.suggestionInputField]: {"ui:field": "autosuggestInput", "ui:options": options}}});
		let state = {schema, uiSchema};
		return state;
	}

	onSuggestionSelected = (suggestion) => {
		let options = this.props.uiSchema["ui:options"];
		let formData = this.props.formData;
		for (let fieldName in options.suggestionReceivers) {
			let suggestionValPath = options.suggestionReceivers[fieldName];
			formData[fieldName] = suggestionValPath.split('.').reduce((o,i)=>o[i], suggestion);
		}
		return formData;
	}

	onInputChange = (formData) => {
		let options = this.props.uiSchema["ui:options"];
		if (!options.allowNonSuggestedValue) {
			this.props.onChange(formData);
		}
	}

	// Unfortunately SchemaFields/Widgets don't pass extra props,
	// so we must use the existing onChange prop for delivering the changes.
	onChange = (formData) => {
		let suggestionInputField = this.props.uiSchema["ui:options"].suggestionInputField;

		if (typeof formData[suggestionInputField] === "object") {
			let suggestion = formData[suggestionInputField];
			formData = this.onSuggestionSelected(suggestion);
			this.props.onChange(formData);
		}

		this.onInputChange(formData);
	}

	render() {
		return (<SchemaField
			{...this.props}
			{...this.state}
		/>);
	}
}

export class AutosuggestInputField extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false
	}

	constructor(props) {
		super(props);
		this.state = {isLoading: false, suggestions: [], ...this.getStateFromProps(props), inputValue: props.formData};
		this.apiClient = new ApiClient();
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props))
	}

	getStateFromProps = (props) => {
		let options = props.uiSchema["ui:options"];
		let autosuggestSettings = autosuggestFieldSettings[options.autosuggestField];
		return {options, autosuggestSettings};
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
			this.get = this.apiClient.fetch("/autocomplete/" + this.state.options.autosuggestField, {q: suggestionValue.value, include_payload: this.state.autosuggestSettings.includePayload})
				.then( suggestions => {
					if (this.promiseTimestamp === timestamp) {
						this.setState({suggestions, isLoading: false});
						this.promiseTimestamp = undefined;
					}
				})
				.catch( error => {
					if (this.promiseTimestamp === timestamp) {
						this.setState({isLoading: false})
						this.promiseTimestamp = undefined;
					}
				});
		})();
	}

	componentWillUnmount() {
		this.promiseTimestamp = undefined;
	}

	onChange = (value) => {
		this.setState({inputValue: value});

		if (this.state.options.allowNonsuggestedValue) {
			this.props.onChange(value);
		}
	}

	// Unfortunately SchemaFields/Widgets don't pass extra props,
	// so we must use the existing onChange prop for delivering the changes.
	onSuggestionSelected = (e, {suggestion}) => {
		this.setState({inputValue: suggestion.value});
		this.props.onChange(suggestion);
	}

	render() {
		let {readonly, formData} = this.props;
		let {suggestions, inputValue} = this.state;

		const inputProps = {...this.props,
			value: (inputValue !== undefined) ? inputValue : "",
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
