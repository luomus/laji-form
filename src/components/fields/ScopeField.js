import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Field with fields, which are shown according to recursive scope.
 * uiSchema = {"ui:options": {
 *  uiSchema: <uiSchema> (ui schema for inner schema)
 *  fieldScopes: {
 *   fieldName: {
 *     fieldValue: {
 *       fields: [<string>] (fields that are shown if fieldName[fieldValue} == true)
 *       refs: [<string>] (root definitions that are merged recursively to this fieldScope)
 *       uiSchema: <uiSchema> (merged recursively to inner uiSchema
 *       fieldScopes: {fieldName: <fieldScope>, fieldName2 ...}
 *     },
 *     fieldValue2, ...
 *   }
 *  },
 *  definitions: {
 *    defName: <fieldScope>,
 *    defname2: ...
 *  }
 * }
 *
 * Field scope values accept asterisk (*) as field scope selector.
 */
export default class ScopeField extends Component {
	static propTypes = {
		formData: PropTypes.object.isRequired,
		schema: PropTypes.object.isRequired,
		uiSchema: PropTypes.object.isRequired,
		idSchema: PropTypes.object.isRequired,
		registry: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0]}
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		let dictionarifiedFieldsInScopes = {};
		function getFieldScopesFields(fieldScope) {
			let scopes = fieldScope.fieldScopes;
			Object.keys(scopes).forEach((fieldName) => {
				dictionarifiedFieldsInScopes[fieldName] = true;
				Object.keys(scopes[fieldName]).forEach((fieldValue) => {
					let fields = scopes[fieldName][fieldValue].fields;
					if (fields) fields.forEach((scopesFieldName) => {
						dictionarifiedFieldsInScopes[scopesFieldName] = true;
					});
					if (scopes[fieldName][fieldValue].fieldScopes)
						getFieldScopesFields(scopes[fieldName][fieldValue]);
				});
			});
		}
		getFieldScopesFields(props.uiSchema["ui:options"]);

		let schemas = this.getSchemas(props);
		return {
			...schemas,
			primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0],
		};
	}

	render() {
		return (
			<SchemaField
				{...this.props}
				{...this.state}
			/>
		)
	}

	// Returns {schema: schema, uiSchema: uiSchema}
	getSchemas = (props) => {
		let {schema, uiSchema, formData, idSchema} = props;

		let options = uiSchema["ui:options"];
		let generatedUiSchema = options.uiSchema || {};

		let fieldsToShow = {};

		const definitions = options.definitions;

		function addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue) {
			let fieldScope = scopes[fieldSelector][fieldSelectorValue];
			if (!fieldScope) return;

			while (fieldScope.refs) {
				let refs = fieldScope.refs;
				fieldScope = update(fieldScope, {$merge: {refs: undefined}});
				refs.forEach(ref => {
					fieldScope = merge(fieldScope, definitions[ref]);
				});
			}

			fieldScope.fields.forEach((fieldName) => {
				fieldsToShow[fieldName] = schema.properties[fieldName];
			});

			if (fieldScope.uiSchema) {
				generatedUiSchema = merge(generatedUiSchema, fieldScope.uiSchema);
			}

			if (fieldScope.fieldScopes) {
				addFieldScopeFieldsToFieldsToShow(fieldScope)
			}
		}
		
		function addFieldScopeFieldsToFieldsToShow(fieldScope) {
			if (!fieldScope) return;
			let scopes = fieldScope.fieldScopes;
			Object.keys(scopes).forEach((fieldSelector) => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValues = formData[fieldSelector];
				if (!Array.isArray(fieldSelectorValues))  fieldSelectorValues = [fieldSelectorValues];
				if (fieldSelectorValues.length > 0 && fieldSelectorValues[0] !== undefined) fieldSelectorValues = update(fieldSelectorValues, {$push: ["+"]});
				fieldSelectorValues = update(fieldSelectorValues, {$push: ["*"]});
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (fieldSelectorValue !== undefined) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}
		addFieldScopeFieldsToFieldsToShow(options);

		let uiOptions = {expanderButtonText: "Näytä lisää muuttujia", contractorButtonText: "Näytä vähemmän muuttujia"};

		if (uiSchema["ui:options"] && uiSchema["ui:options"].innerUiField) uiOptions.innerUiField = uiSchema["ui:options"].innerUiField;

		schema = update(schema, {$merge: {properties: fieldsToShow}});

		Object.keys(schema.properties).forEach(property => {
			idSchema = update(idSchema, {$merge: {[property]: {id: idSchema.id + "_" + property}}});
		});

		return {
			schema: schema,
			uiSchema: generatedUiSchema,
			idSchema: idSchema
		}
	}

	onTaxonNameSelected = (e) => {
		this.props.onChange(getDefaultFormState(this.props.schema, {[this.state.primaryfieldsSelector]: e.target.value}, this.props.registry.definitions));
	}

	onChange = (data) => {
		this.props.onChange(data);
	}
}
