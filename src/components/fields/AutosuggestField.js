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
			let inputValue = that.props.formData;
			return new ApiClient().fetch("/person/by-id/" + inputValue).then((response) => {
				return response.inheritedName + ", " + response.preferredName;
			})
		}
	}
}

/**
 * Sets a given field to be and autosuggest field. The suggestions from the autosuggest field can change other fields values.
 *
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
		options.parentData = props.formData;

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


/**
 * Can be used as a widget. This is a field, because it's impossible to pass parameters to a Widget.
 *
 * uischema = {"ui:options": {
 *  autosuggestField: <string> (field name which is used for api call. The suggestions renderer method is also defined by autosuggestField)
 *  suggestionInputField: <fieldName> (the field which uses autosuggest input)
 *  suggestionReceiver: <suggestion path> (See explanation for suggestion path at the description of AutosuggestField)
 * }}
 */
export class AutosuggestWidget extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}
	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}
	getStateFromProps(props) {
		let {uiSchema} = props;
		uiSchema = update(uiSchema, {$merge: {"ui:field": "autosuggestInput"}});
		delete uiSchema["ui:field"];
		return {uiSchema};
	}
	onChange = (formData) => {
		let suggestionValPath = this.props.uiSchema["ui:options"].suggestionReceive;
		
		let value = (typeof formData === "object") ? 
			suggestionValPath.split('.').reduce((o,i)=>o[i], formData) :
			formData;
		this.props.onChange(value)
	}

	render() {
		return (<AutosuggestInputField
			{...this.props}
			{...this.state}
			onChange={this.onChange}
		/>);
	}
}

/**
 * Metafield used by AutosuggestField and AutosuggestWidget. Should never be used directly. Use AutosuggestWidget instead. 
 * This should really be a widget, but it is impossible to pass options to widgets so we use a field.
 */
export class AutosuggestInputField extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false
	}

	constructor(props) {
		super(props);
		this.state = {isLoading: false, suggestions: [], ...this.getStateFromProps(props)};
		this.apiClient = new ApiClient();
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props), () => {
			if (!this.state.inputValue || (this.state.inputValue && props.formData !== this.state.origValue)) {
				this.triggerConvert(props);
			}
		});
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
		if ((this.state.inputValue !== props.formData) && convert) {
			let origValue = props.formData;
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

	getStateFromProps = (props) => {
		let options = props.uiSchema["ui:options"];
		let autosuggestSettings = autosuggestFieldSettings[options.autosuggestField];
		if (this.state && props.formData !== this.state.inputValue) this.triggerConvert(props);
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

	onChange = (value) => {
		this.setState({inputValue: value});

		if (this.state.options.allowNonsuggestedValue) {
			this.props.onChange(value);
		}
	}

	onBlur = () => {
		if (!this.state.options.allowNonsuggestedValue) {
			this.onChange(this.props.formData)
		}
	}

	// Unfortunately SchemaFields/Widgets don't pass extra props,
	// so we must use the existing onChange prop for delivering the changes.
	onSuggestionSelected = (e, {suggestion}) => {
		e.preventDefault();
		this.setState({inputValue: suggestion.value});
		this.props.onChange(suggestion);
	}

	render() {
		let {readonly} = this.props;
		let {suggestions, inputValue} = this.state;

		const inputProps = {...this.props,
			value: (inputValue !== undefined) ? inputValue : this.props.formData,
			onChange: (e, {newValue}) => {this.onChange(newValue)},
			onBlur: this.onBlur,
			readOnly: readonly};

		if (inputProps.value === undefined || inputProps.value === null) inputProps.value = "";

		let cssClasses = {
			input: "form-control",
			suggestionsContainer: "list-group autosuggest-container",
			suggestion: "list-group-item",
			suggestionFocused: "list-group-item active"
		}
		
		if (this.state.isLoading) cssClasses.container = "autosuggest-loading";

		return (
			<Autosuggest
				id={this.props.idSchema.id}
				inputProps={inputProps}
				suggestions={suggestions}
				getSuggestionValue={this.getSuggestionValue}
				renderSuggestion={this.renderSuggestion}
				onSuggestionsUpdateRequested={this.onSuggestionsUpdateRequested}
				onSuggestionSelected={this.onSuggestionSelected}
				theme={cssClasses}
			/>
		);
	}
}
