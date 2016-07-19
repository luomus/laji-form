import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import { ListGroup, ListGroupItem, DropdownButton, MenuItem } from "react-bootstrap";
import ApiClient from "../../ApiClient";
import Button from "../Button"

const scopeFieldSettings = {
	taxonGroups: {
		translate: taxonGroup => {
			return new ApiClient().fetch("/informal-taxon-groups/" + taxonGroup).then((response) => {
				return response.name;
			})
		},
	}
}

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
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				includeAdditionalFieldsChooserButton: PropTypes.boolean,
				additionalsGroupingPath: PropTypes.string,
				additionalsGroupsTranslator: PropTypes.oneOf(Object.keys(scopeFieldSettings)),
				fieldScopes: PropTypes.object.isRequired,
				definitions: PropTypes.object,
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0], additionalFields: {}, additionalsOpen: false, ...this.getStateFromProps(props)};
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
		let options = props.uiSchema["ui:options"];
		getFieldScopesFields(options);

		let includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;


		let schemas = this.getSchemas(props);
		let state = {
			...schemas,
			primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0],
			includeAdditionalFieldsChooserButton
		};

		if (options.additionalsGroupsTranslator) {
			let prevOptions = (this.props && this.props.uiSchema && this.props.uiSchema["ui:options"]) ? this.props.uiSchema["ui:options"] : {};
			state.additionalsGroupsTranslations = (prevOptions.additionalsGroupsTranslator === options.additionalsGroupsTranslator && this.state) ?
				this.state.additionalsGroupsTranslations : {};
			state.additionalsGroupsTranslator = options.additionalsGroupsTranslator;
		}

		return state;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<div>
				<SchemaField {...this.props} {...this.state} />
				{this.renderAdditionalsButton()}
			</div>
		);
	}

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

			if (fieldScope.fields) fieldScope.fields.forEach((fieldName) => {
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

		let additionalFields = (this.state && this.state.additionalFields) ? this.state.additionalFields : [];
		if (additionalFields) {
			Object.keys(additionalFields).filter(field => additionalFields[field]).forEach((property) => {
				fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
			});
		}

		if (props.formData) {
			Object.keys(formData).forEach((property) => {
				if (formData[property] === undefined) return;
				if (!fieldsToShow[property] && props.schema.properties[property] && additionalFields[property] !== false) {
					fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
				}
			})
		}

		schema = update(schema, {$merge: {properties: fieldsToShow}});

		Object.keys(schema.properties).forEach(property => {
			idSchema = update(idSchema, {$merge: {[property]: {$id: idSchema.$id + "_" + property}}});
		});

		return {
			schema: schema,
			uiSchema: generatedUiSchema,
			idSchema: idSchema
		}
	}

	onChange = (data) => {
		this.props.onChange(data);
	}

	onToggleAdditionals = () => {
		this.setState({additionalsOpen: !this.state.additionalsOpen});
	}

	renderAdditionalsButton = () => {
		if (!this.state.includeAdditionalFieldsChooserButton) return null;

		let list = [];
		if (this.state.additionalsOpen) {
			let translations = (this.state.additionalsGroupsTranslator) ? this.state.additionalsGroupsTranslations : {};
			if (this.state.additionalsGroupsTranslations) {
				if (!Object.keys(this.state.additionalsGroupsTranslations).length) this.translateAdditionalsGroups();
			}

			let additionalProperties = {};
			Object.keys(this.props.schema.properties).forEach(property => {
				if (!this.state.schema.properties || !this.state.schema.properties[property] || this.state.schema.properties[property].additional) additionalProperties[property] = this.props.schema.properties[property];
			});

			let options = this.props.uiSchema["ui:options"];
			if (options.additionalsGroupingPath) {
				var groups = options.additionalsGroupingPath.split('.').reduce((o, i)=>o[i], options);
			}

			if (groups) Object.keys(groups).forEach(groupName => {
				let group = groups[groupName];
				let groupFields = {};
				group.fields.forEach(field => {
					if (additionalProperties[field]) groupFields[field] = additionalProperties[field]
				});
				let groupsList = this.addAdditionalPropertiesToList(groupFields, [], groupName);
				if (groupsList.length) {
					list.push(<MenuItem header
					                    key={groupName}>{translations[groupName] !== undefined ? translations[groupName] : groupName}</MenuItem>);
					list.push(...groupsList);
				}
			}); else {
				list = this.addAdditionalPropertiesToList(additionalProperties, list, "");
			}
		}

		return <DropdownButton
			id={this.props.idSchema.$id + "_dropdown"}
			title="Valitse lisää kenttiä"
			onToggle={this.onToggleAdditionals}
			bsStyle="info">{list}</DropdownButton>;
	}

	addAdditionalPropertiesToList = (properties, list, keyPrefix) => {
		let {additionalFields} = this.state;
		let {formData} = this.props;
		if (!formData) formData = {};

		Object.keys(properties).sort((a, b) => {return ((properties[a].title || a) < (properties[b].title || b)) ? -1 : 1}).forEach(property => {
			let isIncluded = (additionalFields[property] || (additionalFields[property] !== false && formData[property]));
			list.push(<MenuItem
				key={keyPrefix + property}
				active={!!isIncluded}
				onClick={() => {
						additionalFields[property] = !isIncluded;
						this.setState({additionalFields}, () => { this.setState(this.getStateFromProps(this.props)) });
					}}>
				{properties[property].title || property}
			</MenuItem>)
		});
		return list;
	}

	translateAdditionalsGroups = () => {
		let options = this.props.uiSchema["ui:options"];
		if (options.additionalsGroupingPath) {
			var groups = Object.keys(options.additionalsGroupingPath.split('.').reduce((o,i)=>o[i], options));
		}

		let translations = {};
		let translationCount = 0;
		groups.forEach(groupName => {
			scopeFieldSettings[this.state.additionalsGroupsTranslator].translate(groupName).then(translation => {
				translations[groupName] = translation;
				translationCount++;
				if (translationCount == groups.length) this.setState({additionalsGroupsTranslations: translations});
			});
		});
	}
}
