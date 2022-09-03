import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions, isEmptyString, parseJSONPointer, getInnerUiSchema, updateSafelyWithJSONPointer, schemaJSONPointer, uiSchemaJSONPointer, updateFormDataWithJSONPointer, formDataEquals, getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId, capitalizeFirstLetter } from "../../utils";
import BaseComponent from "../BaseComponent";
import { getDefaultFormState } from "@rjsf/utils";
import Context from "../../Context";
import * as merge from "deepmerge";

const suggestionParsers = {
	taxonGroup: suggestion => {
		return suggestion.payload ? suggestion.payload.informalTaxonGroups.map(item => typeof item === "string" ? item : item.id) : [];
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
export default class AutosuggestField extends React.Component {
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
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return "AutosuggestField";}

	UNSAFE_componentWillReceiveProps = (props) => {
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
		const {informalTaxonGroups = "informalTaxonGroups", informalTaxonGroupPersistenceKey, togglePersistenceKey, suggestionInputField, suggestionReceivers} = uiOptions;

		if (togglePersistenceKey) {
			toggled = context[this.getTogglePersistenceContextKey(props)];
		}

		const {toggleable} = uiOptions;

		toggled = (toggled !== undefined)
			? toggled
			: this.state
				? this.state.toggled
				: togglePersistenceKey
					? context[this.getTogglePersistenceContextKey(props)] !== undefined
						? context[this.getTogglePersistenceContextKey(props)]
						: (toggleable && toggleable.toggled || false)
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
			onUnsuggestedSelected: this.onUnsuggestedSelected,
			inputProps: {
				onChange: this.onInputChange
			},
			isValueSuggested: this.isValueSuggested,
			getSuggestionFromValue: this.getSuggestionFromValue,
			onInformalTaxonGroupSelected: informalTaxonGroups ? this.onInformalTaxonGroupSelected : undefined,
			getSuggestionValue: this.getSuggestionValue,
			informalTaxonGroupsValue: props.formData[informalTaxonGroups],
			taxonGroupID,
			placeholder: toggled 
				? typeof toggleable.placeholder === "string"
					? toggleable.placeholder
					: this.props.formContext.translations.UnitAutosuggestFieldTogglePlaceholder
				: uiOptions["ui:placeholder"],
			controlledValue: suggestionReceivers
				&& suggestionReceivers[suggestionInputField]
				&& suggestionReceivers[suggestionInputField] !== "key"
		};

		if (toggleable) {
			options.toggled = toggled;
			options.onToggle = this.onToggleChange;

			options = this.getActiveOptions(options, toggled);
		}

		if (suggestionInputField && props.formData && !isEmptyString(parseJSONPointer(props.formData, suggestionInputField, !!"safe"))) {
			options.value = parseJSONPointer(props.formData, suggestionInputField);
		}

		if (options.query) {
			options.query = parseQuery(options.query, props, [options.taxonGroupID]);
		}

		const innerUiSchema = getInnerUiSchema(uiSchema);
		const _uiSchemaJSONPointer = uiSchemaJSONPointer(schema, suggestionInputField);
		const suggestionInputFieldExistingUiSchema = parseJSONPointer(innerUiSchema, _uiSchemaJSONPointer);
		let widgetProps = suggestionInputFieldExistingUiSchema || {};

		if (options.chooseImages && props.formContext.uiSchemaContext.isEdit && options.value) {
			widgetProps = {
				...widgetProps,
				"ui:title": capitalizeFirstLetter(options.orWriteSpeciesNameLabel || props.formContext.translations.orWriteSpeciesName)
			};
		}

		let _uiSchema = updateSafelyWithJSONPointer(innerUiSchema, {
			"ui:widget": "AutosuggestWidget",
			...widgetProps,
			"ui:options": {
				...getUiOptions((suggestionInputFieldExistingUiSchema || {})[suggestionInputField]),
				...options
			},
		}, _uiSchemaJSONPointer);



		return {schema, uiSchema: _uiSchema, toggled, taxonGroupID};
	}

	getActiveOptions = (options, toggled) => {
		toggled = (toggled !== undefined) ? toggled : (this.state || {}).toggled;
		return toggled ? merge(options, options.toggleable) : options;
	}

	getSuggestionReceiverValue(suggestion, suggestionReceiver) {
		// undefined suggestion clears value.
		let fieldVal = undefined;
		if (typeof suggestion === "object") {
			const suggestionValPath = suggestionReceiver;
			if (suggestionValPath[0] === "$") {
				fieldVal = suggestionParsers[suggestionValPath.substring(1)](suggestion);
			} else {
				const fieldsToTry = suggestionValPath.split("||").map(s => s.trim());
				for (let field of fieldsToTry) {
					fieldVal = parseJSONPointer(suggestion, field);
					if (fieldVal !== undefined) {
						break;
					}
				}
			}
		}
		return fieldVal;
	}

	getSuggestionValue = (suggestion, def) => {
		const {suggestionValueParse} = this.getActiveOptions(getUiOptions(this.props.uiSchema));
		return suggestionValueParse
			? this.getSuggestionReceiverValue(suggestion, suggestionValueParse)
			: def;
	}

	onSuggestionSelected = (suggestion, mounted) => {
		if (suggestion === null) suggestion = undefined;

		let {formData, uiSchema, formContext} = this.props;
		const {suggestionReceivers, autosuggestField, suggestionValueField, autocopy, suggestionInputField} = this.getActiveOptions(getUiOptions(uiSchema));

		const handleSuggestionReceivers = (formData, suggestion) => {
			for (let fieldName in suggestionReceivers) {
				const fieldVal = this.getSuggestionReceiverValue(suggestion, suggestionReceivers[fieldName]);
				formData = updateFormDataWithJSONPointer({...this.props, formData}, fieldVal, fieldName);
			}
			return formData;
		};

		if (autosuggestField === "unit") {
			let {unit} = suggestion.payload;
			if (unit.unitType) {
				unit.informalTaxonGroups = unit.unitType;
				delete unit.unitType;
			}
			unit = (mounted && formContext.formDataTransformers || []).reduce((unit, {"ui:field": uiField, props: fieldProps}) => {
				const {state = {}} = new fieldProps.registry.fields[uiField]({...fieldProps, formData: unit});
				return state.formData;
			}, unit);
			formData = handleSuggestionReceivers(formData, {});
			formData = {...updateFormDataWithJSONPointer({...this.props, formData}, undefined, suggestionValueField), ...unit};
			if (isEmptyString(parseJSONPointer(this.props.formData, suggestionInputField, !!"safe")) && autocopy && !formDataEquals(this.props.formData, formData, this.props.formContext, this.props.idSchema.$id)) {
				this.onNextTick = () => new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "copy", autocopy);
			}
		} else {
			formData = handleSuggestionReceivers(formData, suggestion);
		}
		if (mounted) {
			this.props.onChange(formData);
		} else {
			if (formContext.formDataTransformers) {
				formData = formContext.formDataTransformers.reduce((unit, {"ui:field": uiField, props: fieldProps}) => {
					let changed;
					const getChanged = (_changed) => {
						changed = _changed;
					};

					const field = new fieldProps.registry.fields[uiField]({...fieldProps, formData: formData, onChange: getChanged});
					field.onChange(field.state && field.state.formData ? field.state.formData : formData);
					return changed;
				}, formData);
			}
			const lajiFormInstance = new Context(formContext.contextId).formInstance;
			const pointer = getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId(lajiFormInstance.tmpIdTree, lajiFormInstance.state.formData, this.props.idSchema.$id, this.getUUID());
			const newFormData = {...parseJSONPointer(lajiFormInstance.state.formData, pointer), ...formData};
			lajiFormInstance.onChange({formData: updateSafelyWithJSONPointer(lajiFormInstance.state.formData, newFormData, pointer)});
		}
	}

	onConfirmUnsuggested = (value) => {
		let {formData, uiSchema} = this.props;
		const {suggestionReceivers, suggestionInputField} = this.getActiveOptions(getUiOptions(uiSchema));
		Object.keys(suggestionReceivers).forEach(fieldName => {
			const defaultValue = getDefaultFormState(parseJSONPointer(this.props.schema, schemaJSONPointer(this.props.schema, fieldName), undefined, this.props.registry.definitions));
			formData = updateFormDataWithJSONPointer({...this.props, formData}, defaultValue, fieldName);
		});
		formData = updateFormDataWithJSONPointer({...this.props, formData}, value, suggestionInputField);
		this.props.onChange(formData);
	}

	onInputChange = ({target: {value}}) => {
		let {formData, uiSchema} = this.props;
		const {inputTransformer} = this.getActiveOptions(getUiOptions(uiSchema));
		if (inputTransformer) {
			const regexp = new RegExp(inputTransformer.regexp);
			if (value.match(regexp)) {
				if (!formData) formData = {};
				let formDataChange = {};
				value = value.replace(regexp, "$1");
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
		const {suggestionValueField} = this.getActiveOptions(getUiOptions(uiSchema));
		if (suggestionValueField) {
			return !!parseJSONPointer(formData, suggestionValueField, !!"safe");
		}
		for (let fieldName in this.getActiveOptions(getUiOptions(uiSchema)).suggestionReceivers) {
			if (!formData || !parseJSONPointer(formData, fieldName, !!"safe")) {
				return false;
			}
		}
		return true;
	}

	getSuggestionFromValue = () => {
		const {formData, uiSchema} = this.props;
		const {suggestionValueField, suggestionInputField} = this.getActiveOptions(getUiOptions(uiSchema));

		const suggestionValue = parseJSONPointer(formData, suggestionValueField, !!"safe");
		const suggestionInputValue = parseJSONPointer(formData, suggestionInputField, !!"safe");

		const value = suggestionInputField && formData && !isEmptyString(suggestionValue) ? 
			suggestionInputValue : undefined;
		const key = suggestionValueField && formData && !isEmptyString(suggestionValue) ?
			suggestionValue : undefined;

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
