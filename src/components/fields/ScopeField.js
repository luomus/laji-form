import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import { ListGroup, ListGroupItem, Modal, Glyphicon } from "react-bootstrap";
import Spinner from "react-spinner";
import Masonry from "react-masonry-component";
import SearchInput, { createFilter } from "react-search-input";
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
 *  },
 *  strictFields: [<string>] (array of field names that should not be shown even if
 *                            they have value, if they are not in a field scope)
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
				strictFields: PropTypes.arrayOf(PropTypes.string),
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0],
			additionalFields: {},
			additionalsOpen: false,
			searchTerm: "",
			...this.getStateFromProps(props)};

	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		const options = props.uiSchema["ui:options"];

		const includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;

		const schemas = this.getSchemas(props);
		const state = {
			...schemas,
			primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0],
			includeAdditionalFieldsChooserButton
		};

		if (options.additionalsGroupsTranslator) {
			const prevOptions = (this.props && this.props.uiSchema && this.props.uiSchema["ui:options"]) ? this.props.uiSchema["ui:options"] : {};
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

		function isEmpty(val) { return val === undefined || val === null || val === "" }

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
				if (fieldSelectorValues.length > 0 && !isEmpty(fieldSelectorValues[0])) fieldSelectorValues = update(fieldSelectorValues, {$push: ["+"]});
				fieldSelectorValues = update(fieldSelectorValues, {$push: ["*"]});
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (!isEmpty(fieldSelectorValue)) {
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
			let dictionarifiedStrictFields = {};
			options.strictFields.forEach(field => { dictionarifiedStrictFields[field] = true });

			Object.keys(formData).forEach((property) => {
				if (dictionarifiedStrictFields[property] || isEmpty(formData[property])) return;
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

	onSearchChange = ({target: {value}}) => {
		this.setState({searchTerm: value});
	}

	onToggleAdditionals = () => {
		this.setState({additionalsOpen: !this.state.additionalsOpen});
	}

	renderAdditionalsButton = () => {
		if (!this.state.includeAdditionalFieldsChooserButton || Object.keys(this.props.formData).length === 0) return null;

		let list = [];
		if (this.state.additionalsOpen) {
			let translations = (this.state.additionalsGroupsTranslator) ? this.state.additionalsGroupsTranslations : {};
			let translationsToKeys = (this.state.additionalsGroupsTranslationsToKeys) ? this.state.additionalsGroupsTranslationsToKeys : {};
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

			let filteredGroups = Object.keys(groups);
			if (this.state.searchTerm !== "" && Object.keys(translations).length && groups) {
				filteredGroups = Object.keys(translationsToKeys).filter(translation => translation.toLowerCase().includes(this.state.searchTerm.toLowerCase())).map(translation => translationsToKeys[translation]);
			}

			if (filteredGroups) filteredGroups.forEach(groupName => {
				let group = groups[groupName];
				let groupFields = {};
				group.fields.forEach(field => {
					if (additionalProperties[field]) groupFields[field] = additionalProperties[field];
				});
				let groupsList = this.addAdditionalPropertiesToList(groupFields, [], groupName);
				if (groupsList.length) {
					list.push(
						<div key={groupName} className="scope-field-modal-item">
							<div>
								<span header>{translations[groupName] !== undefined ? translations[groupName] : groupName}</span>
								{translations[groupName] !== undefined ? null : <Spinner />}
							</div>
							<ListGroup key={groupName + "-list"}>{groupsList}</ListGroup>
						</div>
					);
				}
			}); else {
				list = this.addAdditionalPropertiesToList(additionalProperties, list, "");
			}
		}

		return (
			<div>
				<Button onClick={this.onToggleAdditionals}>{this.props.registry.translations.PickMoreFields}</Button>
				{this.state.additionalsOpen ?
					<Modal show={true} onHide={this.onToggleAdditionals} dialogClassName="scope-field-modal"><Modal.Body>
						<div className="scope-field-search form-group has-feedback">
							<input className="form-control" onChange={this.onSearchChange} value={this.state.searchTerm} placeholder={this.props.registry.translations.Search} />
							<i className="glyphicon glyphicon-search form-control-feedback" />
						</div>
						<Masonry>{list}</Masonry>
					</Modal.Body></Modal> : null}
			</div>
		);
	}

	addAdditionalPropertiesToList = (properties, list, keyPrefix) => {
		let {additionalFields} = this.state;
		let {formData} = this.props;
		if (!formData) formData = {};

		Object.keys(properties).sort((a, b) => {return ((properties[a].title || a) < (properties[b].title || b)) ? -1 : 1}).forEach(property => {
			let isIncluded = (additionalFields[property] || (additionalFields[property] !== false && formData[property]));
			list.push(<ListGroupItem
				key={property}
				active={!!isIncluded}
				onClick={() => {
						additionalFields[property] = !isIncluded;
						this.setState({additionalFields}, () => { this.setState(this.getStateFromProps(this.props)) });
					}}>
				{properties[property].title || property}
			</ListGroupItem>)
		});
		return list;
	}

	translateAdditionalsGroups = () => {
		let options = this.props.uiSchema["ui:options"];
		if (options.additionalsGroupingPath) {
			var groups = Object.keys(options.additionalsGroupingPath.split('.').reduce((o,i)=>o[i], options));
		}

		let translations = {};
		let translationsToKeys = {};
		let translationCount = 0;
		groups.forEach(groupName => {
			scopeFieldSettings[this.state.additionalsGroupsTranslator].translate(groupName).then(translation => {
				translations[groupName] = translation;
				translationsToKeys[translation] = groupName;
				translationCount++;
				if (translationCount == groups.length) this.setState({
					additionalsGroupsTranslations: translations,
					additionalsGroupsTranslationsToKeys: translationsToKeys
				});
			});
		});
	}
}
