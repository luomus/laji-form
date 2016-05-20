import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import AdditionalsExpanderField from "./AdditionalsExpanderField";
import Button from "../Button";

/**
 * Field with fields, which are shown according to recursive scope.
 * uiSchema = {"ui:options": {
 *  uiSchema: <uiSchema> (ui schema for inner schema)
 *  fieldScopes: {
 *   fieldName: {
 *     fieldValue: {
 *       fields: [<string>] (fields that are shown if fieldName[fieldValue} == true)
 *       uiSchema: <uiSchema> (merged recursively to inner uiSchema
 *       fieldScopes: {fieldName: <fieldScope>, fieldName2 ...}
 *     },
 *     fieldValue2, ...
 *   }
 *  }
 * }
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
					scopes[fieldName][fieldValue].fields.forEach((scopesFieldName) => {
						dictionarifiedFieldsInScopes[scopesFieldName] = true;
					})
					if (scopes[fieldName][fieldValue].fieldScopes)
						getFieldScopesFields(scopes[fieldName][fieldValue]);
				});
			});
		}
		getFieldScopesFields(props.uiSchema["ui:options"]);

		let dictionarifiedSchemaFields = {};
		Object.keys(props.schema.properties).forEach((fieldName) => {
			dictionarifiedSchemaFields[fieldName] = true;
		});

		let fieldsOutsOfScope = [];
		Object.keys(dictionarifiedSchemaFields).forEach((fieldName) => {
			if (!dictionarifiedFieldsInScopes[fieldName]) fieldsOutsOfScope.push(fieldName)
		});

		let schemas = this.getSchemas(props, fieldsOutsOfScope);
		return {
			primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0],
			schema: schemas.schema,
			uiSchema: schemas.uiSchema
		};
	}

	render() {
		const schema = this.state.schema;
		let selectField = this.state.primaryfieldsSelector;

		let title = schema.properties[selectField].title ? schema.properties[selectField].title : selectField;
		return (
			<SchemaField
				schema={schema}
				onChange={this.onChange}
				formData={this.props.formData}
				errorSchema={this.props.errorSchema}
				idSchema={this.props.idSchema}
				registry={this.props.registry}
				uiSchema={this.state.uiSchema}
			/>
		)
	}

	// Returns {schema: schema, uiSchema: uiSchema}
	getSchemas = (props, fieldsOutOfScope) => {
		let schema = props.schema;
		let uiSchema = props.uiSchema;
		let formData = props.formData;

		let options = uiSchema["ui:options"];
		let generatedUiSchema = options.uiSchema || {};

		let fieldsToShow = {};
		function addFieldScopeFieldsToFieldsToShow(fieldScope) {
			if (!fieldScope) return;
			let scopes = fieldScope.fieldScopes;
			Object.keys(scopes).forEach((fieldSelector) => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValue = formData[fieldSelector];
				if (fieldSelectorValue) {
					let fieldScope = scopes[fieldSelector][fieldSelectorValue];
					if (!fieldScope) return;
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
			});
		}
		addFieldScopeFieldsToFieldsToShow(options);

		fieldsOutOfScope.forEach((fieldName) => {
			fieldsToShow[fieldName] = props.schema.properties[fieldName];
		})

		let uiOptions = {expanderButtonText: "Näytä lisää muuttujia", contractorButtonText: "Näytä vähemmän muuttujia"};

		if (uiSchema["ui:options"] && uiSchema["ui:options"].innerUiField) uiOptions.innerUiField = uiSchema["ui:options"].innerUiField;

		return {
			schema: update(schema, {$merge: {properties: fieldsToShow}}),
			uiSchema: generatedUiSchema
		}
	}

	onTaxonNameSelected = (e) => {
		this.props.onChange(getDefaultFormState(this.props.schema, {[this.state.primaryfieldsSelector]: e.target.value}, this.props.registry.definitions));
	}

	onChange = (data) => {
		this.props.onChange(data);
	}
}
