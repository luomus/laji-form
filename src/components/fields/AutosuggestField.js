import { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, isEmptyString, parseJSONPointer } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import Context from "../../Context";

const suggestionParsers = {
	taxonGroup: suggestion => {
		return suggestion.payload.informalTaxonGroups.map(item => item.id);
	}
};

const parseQuery = (query, props, taxonGroups) => {
	return Object.keys(query).reduce((_query, key) => {
		if (typeof query[key] === "object") {
			const {parser, field} = query[key];
			const {formData = {}} = props;
			if (parser === "arrayJoin") {
				_query[key] = ((key === "informalTaxonGroup" ? taxonGroups : formData[field]) || []).join(",");
			}
		} else {
			_query[key] = query[key];
		}
		return _query;
	}, {});
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
 *   }                                              suggestionReceivers: {someFieldName: "key", someFieldName2: "/payload/informalgroups/0"}
 *                                         If fieldName start  with '$', then a function from autosuggestFieldSettings parses the suggestion. Example: $taxonGroup
 *                                         If fieldName start  with '/', it is handled as a JSON pointer.
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
				}),
				informalTaxonGroups: PropTypes.string,
				informalTaxonGroupPersistenceKey: PropTypes.string
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	static getName() {return "AutosuggestField";}
	static displayName = "kek"
	
	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	getStateFromProps(props) {
		let {schema, formData, formContext} = props;
		const uiOptions = getUiOptions(props);
		const {informalTaxonGroups, informalTaxonGroupPersistenceKey} = uiOptions;
		let options = {
			...uiOptions,
			onSuggestionSelected: this.onSuggestionSelected,
			onConfirmUnsuggested: this.onConfirmUnsuggested,
			onInputChange: this.onInputChange,
			isValueSuggested: this.isValueSuggested,
			getSuggestionFromValue: this.getSuggestionFromValue,
			onInformalTaxonGroupSelected: informalTaxonGroups ? this.onInformalTaxonGroupSelected : undefined,
			taxonGroupID: (
				!informalTaxonGroups 
				? undefined
				: informalTaxonGroupPersistenceKey !== undefined 
					? new Context(`${formContext.contextId}_AUTOSUGGEST_FIELD_PERSISTENCE_${informalTaxonGroupPersistenceKey}`).value
					: formData[informalTaxonGroups] 
						? formData[informalTaxonGroups][0] 
						: undefined
			)
		};
		const {suggestionInputField} = options;

		if (suggestionInputField && props.formData && !isEmptyString(props.formData[suggestionInputField])) {
			options.value = props.formData[suggestionInputField];
		}

		if (options.query) {
			options.query = parseQuery(options.query, props, [options.taxonGroupID]);
		}

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
				if (suggestionValPath[0] === "$") {
					fieldVal = suggestionParsers[suggestionValPath.substring(1)](suggestion);
				} else if (suggestionValPath[0] === "/") {
					fieldVal = parseJSONPointer(suggestion, suggestionValPath);
				} else {
					fieldVal = suggestion[suggestionValPath];
				}
			}
			formData = {...formData, [fieldName]: fieldVal};
		}
		this.props.onChange(formData);
	}

	onConfirmUnsuggested = (value) => {
		let formData = this.props.formData;
		const {suggestionReceivers, suggestionInputField} = this.getUiOptions();
		Object.keys(suggestionReceivers).forEach(fieldName => {
			formData = {...formData, [fieldName]: getDefaultFormState(this.props.schema.properties[fieldName], undefined, this.props.registry.definitions)};
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

	getSuggestionFromValue = () => {
		const {formData} = this.props;
		const {suggestionValueField, suggestionInputField} = this.getUiOptions();

		const value = suggestionInputField && formData && !isEmptyString(formData[suggestionInputField]) ? 
			formData[suggestionInputField] : undefined;
		const key = suggestionValueField && formData && !isEmptyString(formData[suggestionValueField]) ?
			formData[suggestionValueField] : undefined;

		let suggestion = undefined;
		if (value !== undefined && key !== undefined) {
			suggestion = {value, key};
		}

		return suggestion ? Promise.resolve(suggestion) : Promise.reject();
	}

	onInformalTaxonGroupSelected = (informalTaxonID) => {
		const {formContext} = this.props;
		const {informalTaxonGroups, informalTaxonGroupPersistenceKey} = getUiOptions(this.props.uiSchema);
		this.props.onChange({...this.props.formData, [informalTaxonGroups]: [informalTaxonID]});
		if (informalTaxonGroupPersistenceKey !== undefined) {
			new Context(`${formContext.contextId}_AUTOSUGGEST_FIELD_PERSISTENCE_${informalTaxonGroupPersistenceKey}`).value = informalTaxonID;
		}
	}
}
