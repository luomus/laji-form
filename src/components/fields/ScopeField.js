import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import { ListGroup, ListGroupItem, Modal, Glyphicon, Row, Col, Dropdown, MenuItem, OverlayTrigger, Tooltip, Collapse } from "react-bootstrap";
import Spinner from "react-spinner";
import Masonry from "react-masonry-component";
import ApiClient from "../../ApiClient";
import Button from "../Button";
import { propertyHasData, hasData, getUiOptions } from "../../utils";
import Context from "../../Context";

const scopeFieldSettings = {
	taxonGroups: {
		translate: (that, taxonGroup) => {
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
 * additionalsGroupingPath: path to the field scope that defines groups
 * additionalsGroupsTranslator: one of scopeFieldsSettings translator
 * additionalsPersistenceId: instances with same persistence id use the same additional fields
 * additionalsPersistenceKey: form data property value for more fine grained persistence behaviour
 *  uiSchema: <uiSchema> (ui schema for inner schema)
 *  fields: [<string>] (fields that are always shown)
 *  fieldScopes: {
 *   fieldName: {
 *     fieldValue: {
 *       fields: [<string>] (fields that are shown if fieldName[fieldValue} == true)
 *       additionalFields: [<string>] (if grouping is enabled, additional fields are shown only if selected from the list)
 *       refs: [<string>] (root definitions that are merged recursively to this fieldScope)
 *       uiSchema: <uiSchema> (merged recursively to inner uiSchema)
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
				additionalsPersistenceId: PropTypes.string,
				additionalsPersistenceKey: PropTypes.string,
				fieldScopes: PropTypes.object,
				fields: PropTypes.arrayOf(PropTypes.string),
				definitions: PropTypes.object,
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this._context = new Context("SCOPE_FIELD");
		const {additionalsPersistenceKey, additionalsPersistenceId} = getUiOptions(props.uiSchema);
		let additionalFields = {};
		if (this._context[additionalsPersistenceId]) {
			const contextEntry = this._context[additionalsPersistenceId];
			if (additionalsPersistenceKey) {
				const formDataItem = props.formData[additionalsPersistenceKey];
				props.schema.properties[additionalsPersistenceKey].type === "array" ? formDataItem : [formDataItem].forEach(item => {
					additionalFields = contextEntry ? (contextEntry[item] || {}) : {};
				});
			} else {
				additionalFields = contextEntry ? (contextEntry || {}) : {};
			}
		}
		this.state = {
			additionalFields,
			additionalsOpen: false,
			searchTerm: "",
			...this.getStateFromProps(props)
		};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;

		const uiSchema = {...this.state.uiSchema, "ui:buttons": this.renderAdditionalsButton()};
		return <SchemaField {...this.props} {...this.state} uiSchema={uiSchema} />;
	}

	getStateFromProps(props) {
		const options = getUiOptions(props.uiSchema);

		const includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;

		let state = {
			includeAdditionalFieldsChooserButton
		};

		if (options.additionalsGroupsTranslator) {
			const prevOptions = getUiOptions(this.props.uiSchema);

			state.additionalsGroupsTranslations =
				(prevOptions.additionalsGroupsTranslator === options.additionalsGroupsTranslator && this.state) ?
				this.state.additionalsGroupsTranslations : {};
			state.additionalsGroupsTranslator = options.additionalsGroupsTranslator;
		}

		const {additionalsPersistenceKey, additionalsPersistenceId} = getUiOptions(props.uiSchema);
		let additionalFields = (this.state ? this.state.additionalFields : {}) || {};
		if (this._context[additionalsPersistenceId]) {
			const contextEntry = this._context[additionalsPersistenceId];
			let additionalsToAdd = {};
			if (additionalsPersistenceKey) {
				const formDataItem = props.formData[additionalsPersistenceKey];
				(Array.isArray(formDataItem) ? formDataItem : [formDataItem]).forEach(item => {
					if (contextEntry && contextEntry[item]) additionalsToAdd = contextEntry[item];
				});
			} else {
				if (contextEntry) additionalsToAdd = contextEntry;
			}
			additionalFields = {...additionalFields, ...additionalsToAdd};
		}
		state.additionalFields = additionalFields;

		state = {...state, ...this.getSchemasAndAdditionals(props, state)};

		return state;
	}

	getSchemasAndAdditionals = (props, state) => {
		let {schema, uiSchema, formData} = props;
		let additionalFields = (state && state.additionalFields) ? Object.assign({}, state.additionalFields) : {};

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
				if (additionalFields[fieldName]) {
					delete additionalFields[fieldName];
				}
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
					fieldSelectorValues = [...fieldSelectorValues, "+"];
				}
				fieldSelectorValues = [...fieldSelectorValues, "*"];
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (hasData(fieldSelectorValue)) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}

		addFieldScopeFieldsToFieldsToShow(options);

		if (additionalFields) {
			Object.keys(additionalFields).filter(field => additionalFields[field]).forEach((property) => {
				fieldsToShow[property] = this.props.schema.properties[property];
			});
		}

		if (props.formData) {
			Object.keys(formData).forEach((property) => {
				if (!propertyHasData(property, formData) ||
				    (formData.hasOwnProperty(property) &&
				     schema.properties.hasOwnProperty(property) &&
				     formData[property] === schema.properties[property].default)) return;
				if (!fieldsToShow[property] && props.schema.properties[property] && additionalFields[property] !== false) {
					fieldsToShow[property] = this.props.schema.properties[property];
				}
			});
		}

		schema = {...schema, properties: fieldsToShow};

		return {
			schema: schema,
			uiSchema: generatedUiSchema,
			additionalFields
		};
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

		const {additionalsGroupingPath} = getUiOptions(this.props.uiSchema);

		let additionalProperties = {};
		Object.keys(this.props.schema.properties).forEach(property => {
			if (!this.state.schema.properties[property] ||
				(this.state.schema.properties[property] && this.state.additionalFields[property]))
				additionalProperties[property] = this.props.schema.properties[property];
		});

		return (
			<div>
				{additionalsGroupingPath ? this.renderFieldsModal(additionalProperties) : this.renderFieldsDropdown(additionalProperties)}
				{this.renderGlyphFields()}
			</div>
		);
	}

	renderFieldsDropdown(additionalProperties) {
		return (
			<Dropdown id={this.props.idSchema.$id + "-scope-field-dropdown"}
			          bsStyle="info"
			          pullRight
			          onSelect={(eventKey, event) => {
									this.preventCloseDropdown = true;
			          }}
			          onToggle={(isOpen) => {
									if (!this.preventCloseDropdown) this.onToggleAdditionals(isOpen);
									this.preventCloseDropdown = false;
			           }}>
				{this.renderFieldsButton("toggle")}
				<Collapse in={this.state.additionalsOpen} bsRole="menu">
					<Dropdown.Menu>
						{this.additionalPropertiesToList(additionalProperties, MenuItem)}
					</Dropdown.Menu>
				</Collapse>
			</Dropdown>
		);
	}

	renderFieldsModal = (additionalProperties) => {
		const {translations} = this.props.formContext;

		let list = [];

		const options = getUiOptions(this.props.uiSchema);
		const {additionalsGroupingPath} = options;

		let groupTranslations = (this.state.additionalsGroupsTranslator) ? this.state.additionalsGroupsTranslations : {};
		let translationsToKeys = (this.state.additionalsGroupsTranslationsToKeys) ?
			this.state.additionalsGroupsTranslationsToKeys :
		{};

		if (this.state.additionalsGroupsTranslations) {
			if (!Object.keys(this.state.additionalsGroupsTranslations).length) this.translateAdditionalsGroups();
		}

		if (additionalsGroupingPath) {
			var groups = additionalsGroupingPath.split('.').reduce((o, i)=>o[i], options);
		}

		let filteredGroups = groups ? Object.keys(groups) : undefined;
		if (this.state.searchTerm !== "" && Object.keys(groupTranslations).length && groups) {
			filteredGroups = Object.keys(translationsToKeys)
				.filter(translation => translation.toLowerCase().includes(this.state.searchTerm.toLowerCase()))
				.map(translation => translationsToKeys[translation]);
		}

		if (filteredGroups) filteredGroups.forEach(groupName => {
			let group = groups[groupName];
			let groupFields = {};
			const {fields, additionalFields} = group;
			const combinedFields = [];
			[fields, additionalFields].forEach(_fields => {
				if (_fields) combinedFields.push(..._fields);
			});
			combinedFields.forEach(field => {
				if (additionalProperties[field]) groupFields[field] = additionalProperties[field];
			});
			let groupsList = this.additionalPropertiesToList(groupFields, ListGroupItem);
			if (groupsList.length) {
				const someActive = Object.keys(groupFields).some(this.propertyIsIncluded);
				list.push(
					<div key={groupName} className="scope-field-modal-item">
						<ListGroup>{
							[
								(groupTranslations[groupName] !== undefined ? (
									<ListGroupItem  key={groupName + "-list"} active={someActive} onClick={() => {
											this.toggleAdditionalProperty(Object.keys(groupFields)
												.filter(field => {return this.propertyIsIncluded(field) === someActive}))
										}}>
										<strong>{groupTranslations[groupName]}</strong>
									</ListGroupItem>
								) : <Spinner key={groupName + "-list"}/>),
								...groupsList
							]
						}</ListGroup>
					</div>
				);
			}
		});

		return (
			<div>
				{this.renderFieldsButton()}
				{this.state.additionalsOpen ? (
					<Modal show={true} onHide={this.onToggleAdditionals} dialogClassName="laji-form scope-field-modal">
						<Modal.Header closeButton={true}>
							<Modal.Title>{translations.SelectMoreFields}</Modal.Title>
						</Modal.Header>
						<Modal.Body>
								<div className="scope-field-search form-group has-feedback">
									<input className="form-control" onChange={this.onSearchChange}
												 value={this.state.searchTerm} placeholder={translations.Filter} />
									<i className="glyphicon glyphicon-search form-control-feedback" />
								</div>
							<Masonry options={{transitionDuration: 0}}>{list}</Masonry>
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


	toggleAdditionalProperty = (fields) => {
		if (!Array.isArray(fields)) fields = [fields];
		const state = {additionalFields: this.state.additionalFields};
		fields.forEach(field => {
			const isIncluded = this.propertyIsIncluded(field);
			if (propertyHasData(field, this.props.formData)) return;
			state.additionalFields = {...state.additionalFields, [field]: !isIncluded};
		});
		this.setState(state,
			() => {
				const {additionalsPersistenceKey, additionalsPersistenceId} = getUiOptions(this.props.uiSchema);
				const additionalsPersistenceVal = this.props.formData[additionalsPersistenceKey];
				let contextEntry = this._context[additionalsPersistenceId] || {};
				if (additionalsPersistenceKey) {
					const additionalsKeys = ((this.props.schema.properties[additionalsPersistenceKey].type === "array") ?
							additionalsPersistenceVal :
							[additionalsPersistenceVal]) ||
						["undefined"];
					additionalsKeys.forEach(persistenceKey => {
						contextEntry[persistenceKey] = this.state.additionalFields;
						this._context[additionalsPersistenceId] = contextEntry;
					});
				} else {
					contextEntry = this.state.additionalFields;
					this._context[additionalsPersistenceId] = contextEntry;
				}
				this.setState(this.getStateFromProps(this.props));
			});
	}

	additionalPropertiesToList = (properties, ElemType) => {
		return Object.keys(properties)
			.sort((a, b) => {return ((properties[a].title || a) < (properties[b].title || b)) ? -1 : 1})
			.map(property => {
				const isIncluded = this.propertyIsIncluded(property);
				const hasData = propertyHasData(property, this.props.formData);
				return (
					<ElemType
						key={property}
						disabled={hasData}
						active={isIncluded}
						onClick={() => this.toggleAdditionalProperty(property)}>
						{properties[property].title || property}
					</ElemType>
				);
			});
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
