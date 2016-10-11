import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import Spinner from "react-spinner";
import ApiClient from "../../ApiClient";

const suggestionParsers = {
	taxonGroup: suggestion => {
		return suggestion.payload.informalTaxonGroups.map(item => item.id);
	}
}

const autosuggestSettings = {
	taxon: {
		renderMetaInfo: that => {
			const taxonID = that.props.formData.taxonID;
			const tooltipElem = (
				<Tooltip id={taxonID + "-tooltip"}>
					{that.props.registry.translations.openSpeciedCard}
				</Tooltip>
			);
			return (that.mounted && that.props.formData && taxonID) ?
				(
					<div>
						<div className="meta-info-taxon">
							<span className="text-success">{that.props.registry.translations.KnownSpeciesName}</span>
							{that.state.urlTxt ?
								<div><OverlayTrigger overlay={tooltipElem}>
									<a href={"http://tun.fi/" + taxonID}
									   target="_blank">{that.state.urlTxt}</a>
								</OverlayTrigger></div> : <Spinner />}
						</div>
					</div>
				) : null
		}
	}
}

/**
 * Uses AutosuggestWidget to apply autosuggested values to multiple object's fields. Options are passed to AutosuggestWidget.
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
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				autosuggestField: PropTypes.string.isRequired,
				suggestionInputField: PropTypes.string.isRequired,
				allowNonsuggestedValue: PropTypes.boolean,
				suggestionReceivers: PropTypes.object.isRequired,
				inputTransformer: PropTypes.shape({
					regexp: PropTypes.string.isRequired,
					transformations: PropTypes.object.isRequired
				}),
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}
	
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentDidMount() {
		this.mounted = true;
	}
	componentWillUnmount() {
		this.mounted = false;
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {schema} = props;
		let propsUiSchema = props.uiSchema;
		let options = propsUiSchema["ui:options"];
		options = update(options, {$merge: {onSuggestionSelected: this.onSuggestionSelected, onConfirmUnsuggested: this.onConfirmUnsuggested, onInputChange: this.onInputChange, isValueSuggested: this.isValueSuggested}});
		if (autosuggestSettings[options.autosuggestField]) {
			if (autosuggestSettings[options.autosuggestField].renderMetaInfo) options = update(options, {$merge: {onRenderMetaInfo: this.onRenderMetaInfo}});
		}

		let uiSchema = options.uiSchema || {};
		uiSchema = update(uiSchema, {$merge: {[options.suggestionInputField]: {"ui:widget": {component: "autosuggest", options: options}}}});
		let state = {schema, uiSchema};

		const taxonID = (props.formData && props.formData.taxonID) ? props.formData.taxonID : undefined;
		if (taxonID && (!this.state || !this.state.taxonID || this.state.taxonID !== taxonID)) {
			new ApiClient().fetch("/taxa/" + taxonID).then(response => {
				if (this.mounted) this.setState({urlTxt: response.scientificName});
			});
		}

		return state;
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onSuggestionSelected = (suggestion) => {
		if (suggestion === null) suggestion = undefined;

		let formData = this.props.formData;
		const options = this.props.uiSchema["ui:options"];

		for (let fieldName in options.suggestionReceivers) {
			// undefined suggestion clears value.
			let fieldVal = undefined;
			if (typeof suggestion === "object") {
				const suggestionValPath = options.suggestionReceivers[fieldName];
				fieldVal = (suggestionValPath[0] === "$") ?
					suggestionParsers[suggestionValPath.substring(1)](suggestion) :
					suggestionValPath.split('.').reduce((o, i)=>o[i], suggestion);
			}
			formData = update(formData, {$merge: {[fieldName]: fieldVal}});
		}
		this.props.onChange(formData);
	}

	onConfirmUnsuggested = (value) => {
		let formData = this.props.formData;
		const options = this.props.uiSchema["ui:options"];
		Object.keys(this.props.uiSchema["ui:options"].suggestionReceivers).forEach(fieldName => {
			formData = update(formData, {$merge: {[fieldName]: undefined}});
		})
		formData = update(formData, {$merge: {[options.suggestionInputField]: value}});
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

	isValueSuggested = () => {
		for (let fieldName in this.props.uiSchema["ui:options"].suggestionReceivers) {
			if (!this.props.formData || !this.props.formData[fieldName]) return false;
		}
		return true;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField
			{...this.props}
			{...this.state}
		/>);
	}
}
