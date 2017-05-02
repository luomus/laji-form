import { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, isEmptyString } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

const suggestionParsers = {
	taxonGroup: suggestion => {
		return suggestion.payload.informalTaxonGroups.map(item => item.id);
	}
};

/**
 * Uses AutosuggestWidget to apply autosuggested values to multiple object's fields. Options are passed to AutosuggestWidget.
 *
 * uischema = {"ui:options": {
 *  autosuggestField: <string> (field name which is used for api call. The suggestions renderer method is also defined by autosuggestField)
 *  suggestionInputField: <fieldName> (the field which is rendered as the autosuggest input)
 *  suggestionValueField: <fieldName> (the field which the value for autosuggest is pulled from)
 *  suggestionReceivers: {
 *    <fieldName>: <suggestion path>,     (when an autosuggestion is selected, these fields receive the autosuggestions value defined by suggestion path.
 *    <fieldName2>: <suggestion path 2>,   Example: autosuggestion = {key: "MLV.2", value: "kalalokki", payload: {informalGroups: ["linnut"]}}
 *   }                                              suggestionReceivers: {someFieldName: "key", someFieldName2: "payload.informalgroups.0}
 *                                         If fieldName start  with '$', then a function from autosuggestFieldSettings parses the suggestion. Example: $taxonGroup
 *  uiSchema: <uiSchema> (uiSchema which is passed to inner SchemaField)
 * }
 */
@VirtualSchemaField
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
				})
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}
	
	componentDidMount() {
		this.mounted = true;
	}
	componentWillUnmount() {
		this.mounted = false;
	}

	getStateFromProps(props) {
		let {schema} = props;
		const uiOptions = getUiOptions(props);
		let options = {
			...uiOptions,
			onSuggestionSelected: this.onSuggestionSelected,
			onConfirmUnsuggested: this.onConfirmUnsuggested,
			onInputChange: this.onInputChange,
			isValueSuggested: this.isValueSuggested
		};
		if (options.suggestionValueField && props.formData && !isEmptyString(props.formData[options.suggestionValueField])) {
			options.value = props.formData[options.suggestionValueField];
		}
		if (options.suggestionInputField && props.formData && !isEmptyString(props.formData[options.suggestionInputField])) {
			options.inputValue = props.formData[options.suggestionInputField];
		}

		const {suggestionInputField} = uiOptions;

		const uiSchema = {
			...props.uiSchema,
			[suggestionInputField]: {"ui:widget": "AutosuggestWidget", "ui:options": options}
		};

		return {schema, uiSchema};
	}

	onSuggestionSelected = (suggestion) => {
		if (suggestion === null) suggestion = undefined;

		let {formData} = this.props;
		const options = this.getUiOptions();

		for (let fieldName in options.suggestionReceivers) {
			// undefined suggestion clears value.
			let fieldVal = undefined;
			if (typeof suggestion === "object") {
				const suggestionValPath = options.suggestionReceivers[fieldName];
				fieldVal = (suggestionValPath[0] === "$") ?
					suggestionParsers[suggestionValPath.substring(1)](suggestion) :
					suggestion[suggestionValPath];
			}
			formData = {...formData, [fieldName]: fieldVal};
		}
		this.props.onChange(formData);
	}

	onConfirmUnsuggested = (value) => {
		let formData = this.props.formData;
		const {suggestionReceivers, suggestionInputField} = this.getUiOptions();
		Object.keys(suggestionReceivers).forEach(fieldName => {
			formData = {...formData, [fieldName]: undefined};
		});
		formData = {...formData, [suggestionInputField]: value};
		this.props.onChange(formData);
	}

	onInputChange = (value) => {
		let {formData} = this.props;
		const inputTransformer = this.getUiOptions().inputTransformer;
		if (inputTransformer) {
			const regexp = new RegExp(inputTransformer.regexp);
			if (value.match(regexp)) {
				if (!formData) formData = {};
				let formDataChange = {};
				value = value.replace(regexp, "\$1");
				if (inputTransformer.transformations) for (let transformField in inputTransformer.transformations) {
					formDataChange[transformField] = inputTransformer.transformations[transformField];
				}
				formData = {...formData, ...formDataChange};
				this.props.onChange(formData);
			}
		}
		return value;
	}

	isValueSuggested = () => {
		const {formData} = this.props;
		for (let fieldName in this.getUiOptions().suggestionReceivers) {
			if (!formData || !formData[fieldName]) return false;
		}
		return true;
	}
}
