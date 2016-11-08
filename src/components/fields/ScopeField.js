import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import { ListGroup, ListGroupItem, Modal, Glyphicon, Row, Col, Dropdown, MenuItem, OverlayTrigger, Tooltip } from "react-bootstrap";
import Spinner from "react-spinner";
import Masonry from "react-masonry-component";
import ApiClient from "../../ApiClient";
import Button from "../Button";
import { propertyHasData, hasData, getUiOptions } from "../../utils";

const scopeFieldSettings = {
	taxonGroups: {
		translate: (that, taxonGroup) => {
			console.log(that);
			if (taxonGroup === "+") return new Promise(resolve => resolve(that.props.registry.formContext.translations.Others));
			return new ApiClient().fetchCached("/informal-taxon-groups/" + taxonGroup).then((response) => {
				return response.name;
			}).catch(() => {
				return "";
			})
		},
	}
}

/**
 * Field with fields, which are shown according to recursive scope.
 * uiSchema = {"ui:options": {
 *  uiSchema: <uiSchema> (ui schema for inner schema)
 *  fields: [<string>] (fields that are always shown)
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
 * }
 *
 * Field scope values accept asterisk (*) and plus (+) as field scope selector.
 */
export default class ScopeField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				includeAdditionalFieldsChooserButton: PropTypes.boolean,
				additionalsGroupingPath: PropTypes.string,
				additionalsGroupsTranslator: PropTypes.oneOf(Object.keys(scopeFieldSettings)),
				fieldScopes: PropTypes.object,
				fields: PropTypes.arrayOf(PropTypes.string),
				definitions: PropTypes.object,
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {
			additionalFields: {},
			additionalsOpen: false,
			searchTerm: "",
			...this.getStateFromProps(props)
		};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		const options = getUiOptions(props.uiSchema);

		const includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;

		const schemas = this.getSchemas(props);
		const state = {
			...schemas,
			includeAdditionalFieldsChooserButton
		};

		if (options.additionalsGroupsTranslator) {
			const prevOptions = (this.props && this.props.uiSchema && this.props.uiSchema["ui:options"]) ?
				this.props.uiSchema["ui:options"] : {};
			state.additionalsGroupsTranslations =
				(prevOptions.additionalsGroupsTranslator === options.additionalsGroupsTranslator && this.state) ?
				this.state.additionalsGroupsTranslations : {};
			state.additionalsGroupsTranslator = options.additionalsGroupsTranslator;
		}

		return state;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;

	 const registry = update(this.props.registry, {formContext: {$merge: {buttons: this.renderAdditionalsButtons()}}});
		return <SchemaField {...this.props} {...this.state} registry={registry} />;
	}

	getSchemas = (props) => {
		let {schema, uiSchema, formData} = props;

		let options = getUiOptions(uiSchema);
		let generatedUiSchema = options.uiSchema || {};

		let fieldsToShow = {};

		if (options.fields) options.fields.forEach(field => {
			fieldsToShow[field] = schema.properties[field];
		});

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

			if (scopes) Object.keys(scopes).forEach((fieldSelector) => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValues = formData[fieldSelector];
				if (!Array.isArray(fieldSelectorValues))  fieldSelectorValues = [fieldSelectorValues];
				if (fieldSelectorValues.length > 0 && hasData(fieldSelectorValues[0])) {
					fieldSelectorValues = update(fieldSelectorValues, {$push: ["+"]});
				}
				fieldSelectorValues = update(fieldSelectorValues, {$push: ["*"]});
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (hasData(fieldSelectorValue)) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}

		addFieldScopeFieldsToFieldsToShow(options);

		if (options.innerUiField) {
			uiOptions.innerUiField = uiSchema["ui:options"].innerUiField;
		}

		let additionalFields = (this.state && this.state.additionalFields) ? this.state.additionalFields : [];
		if (additionalFields) {
			Object.keys(additionalFields).filter(field => additionalFields[field]).forEach((property) => {
				fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
				if (this.props.schema.properties[property].type === "boolean") fieldsToShow[property].default = true;
			});
		}

		if (props.formData) {
			Object.keys(formData).forEach((property) => {
				if (!propertyHasData(property, formData) ||
				    (formData.hasOwnProperty(property) &&
				     schema.properties.hasOwnProperty(property) &&
				     formData[property] === schema.properties[property].default)) return;
				if (!fieldsToShow[property] && props.schema.properties[property] && additionalFields[property] !== false) {
					fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
				}
			})
		}

		schema = update(schema, {$merge: {properties: fieldsToShow}});

		return {
			schema: schema,
			uiSchema: generatedUiSchema
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

	renderAdditionalsButtons = () => {
		if (!this.state.includeAdditionalFieldsChooserButton || Object.keys(this.props.formData).length === 0) return null;

		const options = getUiOptions(this.props.uiSchema);
		const {additionalsGroupingPath} = options;
		let list = [];
		if (this.state.additionalsOpen) {
			let translations = (this.state.additionalsGroupsTranslator) ? this.state.additionalsGroupsTranslations : {};
			let translationsToKeys = (this.state.additionalsGroupsTranslationsToKeys) ?
				this.state.additionalsGroupsTranslationsToKeys :
				{};

			if (this.state.additionalsGroupsTranslations) {
				if (!Object.keys(this.state.additionalsGroupsTranslations).length) this.translateAdditionalsGroups();
			}

			let additionalProperties = {};
			Object.keys(this.props.schema.properties).forEach(property => {
				if (!this.state.schema.properties ||
				    !this.state.schema.properties[property] ||
				    this.state.schema.properties[property].additional)
					additionalProperties[property] = this.props.schema.properties[property];
			});

			if (additionalsGroupingPath) {
				var groups = additionalsGroupingPath.split('.').reduce((o, i)=>o[i], options);
			}

			let filteredGroups = groups ? Object.keys(groups) : undefined;
			if (this.state.searchTerm !== "" && Object.keys(translations).length && groups) {
				filteredGroups = Object.keys(translationsToKeys)
					.filter(translation => translation.toLowerCase().includes(this.state.searchTerm.toLowerCase()))
					.map(translation => translationsToKeys[translation]);
			}

			if (filteredGroups) filteredGroups.forEach(groupName => {
				let group = groups[groupName];
				let groupFields = {};
				group.fields.forEach(field => {
					if (additionalProperties[field]) groupFields[field] = additionalProperties[field];
				});
				let groupsList = this.addAdditionalPropertiesToList(groupFields, [], ListGroupItem);
				if (groupsList.length) {
					list.push(
						<div key={groupName} className="scope-field-modal-item">
							{translations[groupName] !== undefined ? <span>{translations[groupName]}</span> : <Spinner />}
							<ListGroup key={groupName + "-list"}>{groupsList}</ListGroup>
						</div>
					);
				}
			}); else {
				list = this.addAdditionalPropertiesToList(additionalProperties, list, MenuItem);
			}
		}

		return (
			<div>
				{additionalsGroupingPath ? this.renderFieldsModal(list) : this.renderFieldsDropdown(list)}
				{this.renderGlyphFields()}
			</div>
		);
	}

	renderFieldsDropdown(list) {
		return (
			<Dropdown id={this.props.idSchema.$id + "-scope-field-dropdown"}
			          bsStyle="info"
			          pullRight
			          onSelect={(eventKey, event) => {
									this.preventCloseDropdown = true;
			          }}
			          open={this.state.additionalsOpen}
			          onToggle={(isOpen) => {
									if (!this.preventCloseDropdown) this.onToggleAdditionals(isOpen);
									this.preventCloseDropdown = false;
			           }}>
				{this.renderFieldsButton("toggle")}
				<Dropdown.Menu>
					{list}
				</Dropdown.Menu>
			</Dropdown>
		);
	}

	renderFieldsModal = (list) => {
		const {translations} = this.props.formContext;

		return (
			<div>
				{this.renderFieldsButton()}
				{this.state.additionalsOpen ?  (
					<Modal show={true} onHide={this.onToggleAdditionals} dialogClassName="laji-form scope-field-modal">
						<Modal.Header closeButton={true} ><Modal.Title>{translations.SelectMoreFields}</Modal.Title></Modal.Header>
						<Modal.Body>
								<div className="scope-field-search form-group has-feedback">
									<input className="form-control" onChange={this.onSearchChange}
												 value={this.state.searchTerm} placeholder={translations.Filter} />
									<i className="glyphicon glyphicon-search form-control-feedback" />
								</div>
							<Masonry>{list}</Masonry>
						</Modal.Body>
					</Modal>
				) : null}
			</div>
		);
	}

	renderFieldsButton = (bsRole) => {
		const glyph = <Glyphicon glyph="cog" />;
		const tooltip = (
			<Tooltip id={`${this.props.idSchema.$id}-additionals-tooltip`}>
				{this.props.formContext.translations.SelectMoreFields}
			</Tooltip>
		);


		return (
			<OverlayTrigger overlay={tooltip} placement="left" bsRole={bsRole} >
				<Button className="glyph-button" onClick={this.onToggleAdditionals}>
					{glyph}
				</Button>
			</OverlayTrigger>
		);
	}

	renderGlyphFields = () => {
		const {glyphFields} = getUiOptions(this.props.uiSchema);

		return glyphFields ?
			Object.keys(glyphFields).map(property => {
				const isIncluded = this.propertyIsIncluded(property);
				const hasData = propertyHasData(property, this.props.formData);
				return (
					<Button key={property} disabled={hasData} className="glyph-button" bsStyle={isIncluded ? "primary" : "default"}
					        onClick={ () => this.toggleAdditionalProperty(property)}>
						<Glyphicon glyph={glyphFields[property]} />
					</Button>
				);
		}) : null;
	}

	propertyIsIncluded = (property) => {
		const {additionalFields} = this.state;

		const isIncluded = !!(additionalFields[property] === true || this.state.schema.properties[property]);

		return isIncluded;
	}


	toggleAdditionalProperty = (field) => {
		const isIncluded = this.propertyIsIncluded(field);
		if (propertyHasData(field, this.props.formData))	return;
		this.setState({additionalFields: update(this.state.additionalFields, {$merge: {[field]: !isIncluded}})},
			() => {this.setState(this.getStateFromProps(this.props))});
	}

	addAdditionalPropertiesToList = (properties, list, ElemType) => {
		Object.keys(properties)
			.sort((a, b) => {return ((properties[a].title || a) < (properties[b].title || b)) ? -1 : 1})
			.forEach(property => {
				const isIncluded = this.propertyIsIncluded(property);
				const hasData = propertyHasData(property, this.props.formData);
				list.push(<ElemType
					key={property}
					disabled={hasData}
					active={isIncluded}
					onClick={() => this.toggleAdditionalProperty(property)}>
					{properties[property].title || property}
				</ElemType>)
			});
		return list;
	}

	translateAdditionalsGroups = () => {
		let options = getUiOptions(this.props.uiSchema);
		const {additionalsGroupingPath} = options;
		if (additionalsGroupingPath) {
			var groups = Object.keys(additionalsGroupingPath.split('.').reduce((o,i)=>o[i], options));
		}

		let translations = {};
		let translationsToKeys = {};
		let translationCount = 0;
		groups.forEach(groupName => {
			scopeFieldSettings[this.state.additionalsGroupsTranslator].translate(this, groupName).then(translation => {
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
