import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import ApiClient from "../../ApiClient";

const suggestionParsers = {
	taxonGroup: suggestion => {
		return suggestion.payload.informalTaxonGroups.map(item => item.id);
	}
}
const autosuggestSettings = {
	taxon: {
		renderMetaInfo: that => {
			const taxonID = (that.props.formData && that.props.formData.taxonID) ? that.props.formData.taxonID : undefined;
			if (taxonID && (!that.state.taxonID || that.state.taxonID !== taxonID)) {
				new ApiClient().fetch("/taxonomy/" + taxonID).then(response => {
					that.setState({urlTxt: response.scientificName});
				});
			}
			return (taxonID) ?
				(<div>
					<span className="text-success">{that.props.registry.translations.KnownSpeciesName}</span><br />
					<a href={"http://tun.fi/" + taxonID + "?locale=" + that.props.registry.lang} target="_blank">{(that.state.urlTxt || taxonID)}</a>
				</div>) : null
		}
	}
}

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
 *                                         If fieldName start  with '$', then a function from autosuggestFieldSettings parses the suggestion. Example: $taxonGroup
 *  uiSchema: <uiSchema> (uiSchema which is passed to inner SchemaField)
 * }
 */
export default class AutosuggestField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {schema} = props;
		let propsUiSchema = props.uiSchema;
		let options = propsUiSchema["ui:options"];
		options = update(options, {$merge: {onSuggestionSelected: this.onSuggestionSelected, onInputChange: this.onInputChange}});
		if (autosuggestSettings[options.autosuggestField]) options = update(options, {$merge: {onRenderMetaInfo: this.onRenderMetaInfo}});

		let uiSchema = options.uiSchema || {};
		uiSchema = update(uiSchema, {$merge: {[options.suggestionInputField]: {"ui:widget": {component: "autosuggest", options: options}}}});
		let state = {schema, uiSchema};
		return state;
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onSuggestionSelected = (suggestion) => {
		let formData = this.props.formData;
		const options = this.props.uiSchema["ui:options"];
		for (let fieldName in options.suggestionReceivers) {
			const suggestionValPath = options.suggestionReceivers[fieldName];
			const fieldVal = (suggestionValPath[0] === "$") ?
				suggestionParsers[suggestionValPath.substring(1)](suggestion) :
				suggestionValPath.split('.').reduce((o,i)=>o[i], suggestion);

			formData = update(formData, {$merge: {[fieldName]: fieldVal}});
		}
		this.props.onChange(formData);
	}

	onInputChange = (value) => {
		let {formData} = this.props;
		const options = this.props.uiSchema["ui:options"];
		const inputTransformer = options.inputTransformer;
		if (inputTransformer) {
			const regexp = new RegExp(inputTransformer.regexp);
			if (value.match(regexp)) {
				if (!formData) formData = {};
				let formDataChange = {};
				value = value.replace(regexp, "\$1");
				if (inputTransformer.transformations) for (let transformField in inputTransformer.transformations) {
					formDataChange[transformField] = inputTransformer.transformations[transformField];
				}
				formData = update(formData, {$merge: formDataChange});
				this.props.onChange(formData);
			}
		}
		return value;
	}

	onRenderMetaInfo = () => {
		return autosuggestSettings[this.props.uiSchema["ui:options"].autosuggestField].renderMetaInfo(this);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField
			{...this.props}
			{...this.state}
		/>);
	}
}
