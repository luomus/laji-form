import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"

/**
 * Uses AutosuggestWidget to apply autosuggested values to multiple object's fields. Options are passed to AutoSuggestWidget.
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
		this.state = {onChange: this.onChange, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {schema} = props;
		let propsUiSchema = props.uiSchema;
		let options = propsUiSchema["ui:options"];
		options = update(options, {$merge: {onSuggestionSelected: this.onSuggestionSelected}});

		let uiSchema = options.uiSchema || {};
		uiSchema = update(uiSchema, {$merge: {[options.suggestionInputField]: {"ui:widget": {component: "autosuggest", options: options}}}});
		let state = {schema, uiSchema};
		return state;
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onChange = (formData) => {
		const options = this.props.uiSchema["ui:options"];
		for (let fieldName in options.suggestionReceivers) {
			if (fieldName === options.suggestionInputField) continue;
			formData = update(formData, {$merge: {[fieldName]: undefined}});
		}
		this.props.onChange(formData)
	}

	onSuggestionSelected = (suggestion) => {
		let formData = this.props.formData;
		const options = this.props.uiSchema["ui:options"];
		for (let fieldName in options.suggestionReceivers) {
			const suggestionValPath = options.suggestionReceivers[fieldName];
			const fieldVal = suggestionValPath.split('.').reduce((o,i)=>o[i], suggestion);
			formData = update(formData, {$merge: {[fieldName]: fieldVal}});
		}
		this.props.onChange(formData);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField
			{...this.props}
			{...this.state}
		/>);
	}
}

