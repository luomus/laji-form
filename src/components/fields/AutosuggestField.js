import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, isEmptyString, parseJSONPointer, getInnerUiSchema } from "../../utils";
import BaseComponent from "../BaseComponent";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import Context from "../../Context";
import merge from "deepmerge";
import equals from "deep-equal";

const suggestionParsers = {
	taxonGroup: suggestion => {
		return suggestion.payload ? suggestion.payload.informalTaxonGroups.map(item => item.id) : [];
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
@BaseComponent
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

	componentWillReceiveProps = (props) => {
		this.setState(this.getStateFromProps(props));
		if (this.onNextTick) {
			this.onNextTick();
			this.onNextTick = undefined;
		}
	}

	getTogglePersistenceContextKey = (props) => `AUTOSUGGEST_FIELD_TOGGLE_PERSISTENCE_${props.uiSchema["ui:options"].togglePersistenceKey}`
	getInformalTaxonGroupsPersistenceContextKey = (props) => `AUTOSUGGEST_FIELD_PERSISTENCE_${props.uiSchema["ui:options"].informalTaxonGroupPersistenceKey}`
	
	getStateFromProps = (props, toggled) => {
		let {schema, uiSchema, formData} = props;
		const context = new Context(this.props.formContext.contextId);
		const uiOptions = getUiOptions(uiSchema);
		const {informalTaxonGroups = "informalTaxonGroups", informalTaxonGroupPersistenceKey, togglePersistenceKey} = uiOptions;

		if (togglePersistenceKey) {
			toggled = context[this.getTogglePersistenceContextKey(props)];
		}

		toggled = (toggled !== undefined)
			? toggled
			: this.state
				?  this.state.toggled
					: togglePersistenceKey
						? context[this.getTogglePersistenceContextKey(props)]
						: false;

		const taxonGroupID = !informalTaxonGroups 
			? undefined
			: informalTaxonGroupPersistenceKey !== undefined 
				? context[this.getInformalTaxonGroupsPersistenceContextKey(props)]
				: formData[informalTaxonGroups] 
					? formData[informalTaxonGroups][0] 
					: undefined;

		let options = {
			...uiOptions,
			onSuggestionSelected: this.onSuggestionSelected,
			onConfirmUnsuggested: this.onConfirmUnsuggested,
			onInputChange: this.onInputChange,
			isValueSuggested: this.isValueSuggested,
			getSuggestionFromValue: this.getSuggestionFromValue,
			onInformalTaxonGroupSelected: informalTaxonGroups ? this.onInformalTaxonGroupSelected : undefined,
			informalTaxonGroupsValue: props.formData[informalTaxonGroups],
			taxonGroupID,
			placeholder: toggled 
				? this.props.formContext.translations.UnitAutosuggestFieldTogglePlaceholder 
				: uiOptions["ui:placeholder"]
		};

		if (uiOptions.toggleable) {
			options.toggled = toggled;
			options.onToggle = this.onToggleChange;

			options = this.getActiveOptions(options, toggled);
		}

		const {suggestionInputField} = options;

		if (suggestionInputField && props.formData && !isEmptyString(props.formData[suggestionInputField])) {
			options.value = props.formData[suggestionInputField];
		}

		if (options.query) {
			options.query = parseQuery(options.query, props, [options.taxonGroupID]);
		}

		const innerUiSchema = getInnerUiSchema(uiSchema);
		const _uiSchema = {
			...innerUiSchema,
			[suggestionInputField]: {
				"ui:widget": "AutosuggestWidget",
				...(innerUiSchema[suggestionInputField] || {}),
				"ui:options": {
					...getUiOptions(innerUiSchema[suggestionInputField]),
					...options
				},
			}
		};

		return {schema, uiSchema: _uiSchema, toggled, taxonGroupID};
	}

	getActiveOptions = (options, toggled) => {
		toggled = (toggled !== undefined) ? toggled : (this.state || {}).toggled;
		return toggled ? merge(options, options.toggleable) : options;
	}

	onSuggestionSelected = (suggestion) => {
		if (suggestion === null) suggestion = undefined;

		let {formData, uiSchema, formContext} = this.props;
		const {suggestionReceivers, autosuggestField, suggestionValueField, autocopy, suggestionInputField} = this.getActiveOptions(getUiOptions(uiSchema));

		const handleSuggestionReceivers = (formData, suggestion) => {
			for (let fieldName in suggestionReceivers) {
				// undefined suggestion clears value.
				let fieldVal = undefined;
				if (typeof suggestion === "object") {
					const suggestionValPath = suggestionReceivers[fieldName];
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
			return formData;
		};

		if (autosuggestField === "unit") {
			let {unit} = suggestion.payload;
			if (unit.unitType) {
				unit.informalTaxonGroups = unit.unitType;
				delete unit.unitType;
			}
			unit = (formContext.formDataTransformers || []).reduce((unit, {"ui:field": uiField, props: fieldProps}) => {
				const {state = {}} = new fieldProps.registry.fields[uiField]({...fieldProps, formData: unit});
				return state.formData;
			}, unit);
			formData = handleSuggestionReceivers(formData, {});
			formData = {...formData, [suggestionValueField]: undefined, ...unit};
			if (isEmptyString(this.props.formData[suggestionInputField]) && autocopy && !equals(this.props.formData, formData)) {
				this.onNextTick = () => new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "copy", autocopy);
			}
		} else {
			formData = handleSuggestionReceivers(formData, suggestion);
		}
		this.props.onChange(formData);
	}

	onConfirmUnsuggested = (value) => {
		let {formData, uiSchema} = this.props;
		const {suggestionReceivers, suggestionInputField} = this.getActiveOptions(getUiOptions(uiSchema));
		Object.keys(suggestionReceivers).forEach(fieldName => {
			formData = {...formData, [fieldName]: getDefaultFormState(this.props.schema.properties[fieldName], undefined, this.props.registry.definitions)};
		});
		formData = {...formData, [suggestionInputField]: value};
		this.props.onChange(formData);
	}

	onInputChange = (value) => {
		let {formData, uiSchema} = this.props;
		const {inputTransformer} = this.getActiveOptions(getUiOptions(uiSchema));
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
		const {formData, uiSchema} = this.props;
		for (let fieldName in this.getActiveOptions(getUiOptions(uiSchema)).suggestionReceivers) {
			if (!formData || !formData[fieldName]) return false;
		}
		return true;
	}

	getSuggestionFromValue = () => {
		const {formData, uiSchema} = this.props;
		const {suggestionValueField, suggestionInputField} = this.getActiveOptions(getUiOptions(uiSchema));

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
		const {uiSchema} = this.props;
		const {informalTaxonGroups, informalTaxonGroupPersistenceKey} = this.getActiveOptions(getUiOptions(uiSchema));
		if (informalTaxonGroupPersistenceKey !== undefined) {
			new Context(this.props.formContext.contextId)[this.getInformalTaxonGroupsPersistenceContextKey(this.props)] = informalTaxonID;
			this.setState(this.getStateFromProps(this.props));
		} else {
			this.props.onChange({...this.props.formData, [informalTaxonGroups]: [informalTaxonID]});
		}
	}

	onToggleChange = (value) => {
		const {togglePersistenceKey} = getUiOptions(this.props.uiSchema);
		if (togglePersistenceKey) {
			new Context(this.props.formContext.contextId)[this.getTogglePersistenceContextKey(this.props)] = value;
		}
		this.setState(this.getStateFromProps(this.props, value));
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} uiSchema={this.state.uiSchema} />;
	}
}
