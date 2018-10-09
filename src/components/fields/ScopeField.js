import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import merge from "deepmerge";
import equals from "deep-equal";
import { ListGroup, ListGroupItem, Modal, MenuItem, OverlayTrigger, Tooltip, Collapse, Popover } from "react-bootstrap";
import Dropdown from "react-bootstrap/lib/Dropdown";
import DropdownMenu from "react-bootstrap/lib/DropdownMenu";
import Spinner from "react-spinner";
import ApiClient from "../../ApiClient";
import { GlyphButton } from "../components";
import { propertyHasData, hasData, isDefaultData, getUiOptions, getInnerUiSchema, parseJSONPointer, isNullOrUndefined, syncScroll, dictionarify, updateTailUiSchema, getNestedTailUiSchema, isObject } from "../../utils";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import { Map } from "./MapArrayField";
import { computeUiSchema } from "./ConditionalUiSchemaField";

const scopeFieldSettings = {
	taxonGroups: {
		translate: (props, taxonGroup) => {
			return new ApiClient().fetchCached("/informal-taxon-groups/" + taxonGroup).then((response) => {
				return response.name;
			}).catch(() => {
				return "";
			});
		},
	}
};

/**
 * Field with fields, which are shown according to recursive scope.
 * uiSchema = {"ui:options": {
 * additionalsGroupingPath: path to the field scope that defines groups
 * additionalsGroupsTranslator: one of scopeFieldsSettings translator
 * additionalsPersistenceKey: instances with same persistence id use the same additional fields
 * additionalsPersistenceField: form data property value for more fine grained persistence behaviour
 * uiSchema: <uiSchema> (ui schema for inner schema)
 * fields: [<string>] (fields that are always shown)
 * fieldScopes: {
 *  fieldName: {
 *    fieldValue: {
 *      fields: [<string>] (fields that are shown if fieldName[fieldValue} == true)
 *      additionalFields: [<string>] (if grouping is enabled, additional fields are shown only if selected from the list)
 *      excludeFields: [<string>] (exclude fields from showing)
 *      excludeFields: [<string>] (fields that are shown by default)
 *      refs: [<string>] (root definitions that are merged recursively to this fieldScope)
 *      uiSchema: <uiSchema> (merged recursively to inner uiSchema)
 *      uiSchemaMergeType: See documentation for ConditionalUiSchemaField
 *      fieldScopes: {fieldName: <fieldScope>, fieldName2 ...}
 *    },
 *    fieldValue2, ...
 *  }
 * },
 * definitions: {
 *   defName: <fieldScope>,
 *   defname2: ...
 * }
 * }
 *
 * Field scope values accept asterisk (*) and plus (+) as field scope selector.
 */
@BaseComponent
export default class ScopeField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				includeAdditionalFieldsChooserButton: PropTypes.boolean,
				additionalsGroupingPath: PropTypes.string,
				additionalsGroupsTranslator: PropTypes.oneOf(Object.keys(scopeFieldSettings)),
				additionalsPersistenceKey: PropTypes.string,
				additionalsPersistenceField: PropTypes.string,
				fieldScopes: PropTypes.object,
				fields: PropTypes.arrayOf(PropTypes.string),
				definitions: PropTypes.object,
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;

		const {additionalsGroupingPath, taxonField} = getUiOptions(this.props.uiSchema);

		const {translations} = this.props.formContext;
		let uiSchema = {
			...this.state.uiSchema, 
			"ui:buttons": [
				...(this.props.uiSchema["ui:buttons"] || []),
				this.renderAdditionalsButton()
			]
		};

		const addButton = button => {
			uiSchema = {
				...uiSchema,
				"ui:buttons": [
					uiSchema["ui:buttons"],
					button
				]
			};
		};

		if (this.state.additionalsOpen && additionalsGroupingPath) {
			addButton(this.modal);
		}

		return <SchemaField {...this.props} {...this.state} uiSchema={uiSchema} />;
	}

	componentDidUpdate(prevProps, prevState) {
		if (!this.state.additionalsGroupsTranslations || prevProps.formContext.lang !== this.props.formContext.lang ||
			getUiOptions(prevProps.uiSchema).additionalsGroupsTranslator !== getUiOptions(this.props.uiSchema).additionalsGroupsTranslator) {
			this.translateAdditionalsGroups(this.props);
		}
		if (!equals(prevState.schema.properties, this.state.schema.properties)) {
			const context = new Context(this.props.formContext.contextId);
			syncScroll(this.props.formContext);
			context.sendCustomEvent(this.props.idSchema.$id, "resize");
		}
	}

	getAdditionalPersistenceValue = (props, includeUndefined = true) => {
		const {additionalsPersistenceField, additionalPersistenceContextKey} = getUiOptions(props.uiSchema);
		let formDataItem = props.formData[additionalsPersistenceField];
		if (additionalPersistenceContextKey && (formDataItem === undefined || Array.isArray(formDataItem) && formDataItem.length === 0)) {
			formDataItem = new Context(this.props.formContext.contextId)[additionalPersistenceContextKey];
		}
		let items = (Array.isArray(formDataItem) ? formDataItem : [formDataItem]);
		if (includeUndefined) items = ["undefined", ...items];
		return items;
	}


	getStateFromProps(props) {
		const options = getUiOptions(props.uiSchema);

		const includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;

		let state = {
			includeAdditionalFieldsChooserButton
		};

		const {additionalsPersistenceField, additionalsPersistenceKey} = getUiOptions(props.uiSchema);

		let additionalFields = additionalsPersistenceField
			?  {}
			: (this.state ? this.state.additionalFields : {});

		if (additionalsPersistenceKey) {
			const mainContext = this.getContext();
			this._context = mainContext[ `scopeField_${additionalsPersistenceKey}`];
		}

		if (this._context) {
			let additionalsToAdd = {};
			if (additionalsPersistenceField) {
				const additionalPersistenceValue = this.getAdditionalPersistenceValue(props);
				additionalPersistenceValue.forEach(item => {
					if (this._context && this._context[item]) additionalsToAdd = {...additionalsToAdd, ...this._context[item]};
				});
			} else {
				if (this._context) additionalsToAdd = this._context;
			}
			additionalFields = {...additionalFields, ...additionalsToAdd};
		}
		state.additionalFields = additionalFields;

		state = {...state, ...this.getSchemasAndAdditionals(props, state)};

		return state;
	}

	getSchemasAndAdditionals = (props, state) => {
		let {schema, uiSchema, formData} = props;
		let additionalFields = (state && state.additionalFields) ? {...state.additionalFields} : {};
		let defaultFields = (state && state.defaultFields) ? {...state.defaultFields} : {};

		const options = getUiOptions(uiSchema);
		let {fields = [], definitions, glyphFields = [], geometryField = "unitGathering_geometry", taxonField} = options;
		let generatedUiSchema = getInnerUiSchema(uiSchema);

		let fieldsToShow = {};

		fields.forEach(field => {
			fieldsToShow[field] = schema.properties[field];
		});
		
		let hasSetLocation = false;

		glyphFields.reduce((additionalFields, {show, open, fn}) => {
			if (fn === "setLocation") {
				hasSetLocation = true;
			}
			if (!(show in additionalFields) && show && open) {
				additionalFields[show] = open;
			}
			return additionalFields;
		}, additionalFields);

		function addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue) {
			let fieldScope = scopes[fieldSelector][fieldSelectorValue];
			if (!fieldScope) return;

			while (fieldScope.refs) {
				let refs = fieldScope.refs;
				fieldScope = {...fieldScope, refs: undefined};
				refs.forEach(ref => {
					fieldScope = merge(fieldScope, definitions[ref]);
				});
			}

			const {excludeFields = [], fields: _fields = [], defaultFields: _defaultFields = []} = fieldScope;

			excludeFields.forEach(fieldName => {
				delete fieldsToShow[fieldName];
			});

			_defaultFields.forEach(fieldName => {
				if (additionalFields[fieldName] !== false) fieldsToShow[fieldName] = schema.properties[fieldName];
			});

			_fields.forEach((fieldName) => {
				fieldsToShow[fieldName] = schema.properties[fieldName];
				if (additionalFields[fieldName]) {
					delete additionalFields[fieldName];
				}
			});

			if (fieldScope.uiSchema) {
				const {uiSchemaMergeType = "merge"} = fieldScope;
				generatedUiSchema = computeUiSchema(generatedUiSchema, {type: uiSchemaMergeType, uiSchema: fieldScope.uiSchema});
			}

			if (fieldScope.fieldScopes) {
				addFieldScopeFieldsToFieldsToShow(fieldScope);
			}
		}
		
		const that = this;
		function addFieldScopeFieldsToFieldsToShow(fieldScope) {
			if (!fieldScope) return;
			let scopes = fieldScope.fieldScopes;

			if (scopes) Object.keys(scopes).forEach(fieldSelector => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValues = formData[fieldSelector];
				if (!fieldSelectorValues || Array.isArray(fieldSelectorValues) && !fieldSelectorValues.length) {
					fieldSelectorValues = that.getAdditionalPersistenceValue(props);
				}
				if (!Array.isArray(fieldSelectorValues)) fieldSelectorValues = [fieldSelectorValues];
				if (scopes[fieldSelector]["+"] && fieldSelectorValues.length > 0 && fieldSelectorValues.some(_fieldSelectorValue => hasData(_fieldSelectorValue) && !isDefaultData(_fieldSelectorValue, schema.properties[fieldSelector], props.registry.definitions))) {
					addFieldSelectorsValues(scopes, fieldSelector, "+");
				}
				if (scopes[fieldSelector]["*"]) {
					addFieldSelectorsValues(scopes, fieldSelector, "*");
				}
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (hasData(fieldSelectorValue) && !isDefaultData(fieldSelectorValue, schema.properties[fieldSelector].type === "array" ? schema.properties[fieldSelector].items : schema.properties[fieldSelector], props.registry.definitions)) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}

		addFieldScopeFieldsToFieldsToShow(options);

		if (additionalFields) {
			Object.keys(additionalFields).filter(field => additionalFields[field]).forEach((property) => {
				if (additionalFields[property]) {
					fieldsToShow[property] = props.schema.properties[property];
				}
			});
		}

		if (formData) {
			Object.keys(formData).forEach((property) => {
				if (!propertyHasData(property, formData) ||
				    (formData.hasOwnProperty(property) &&
				     schema.properties.hasOwnProperty(property) &&
				     formData[property] === schema.properties[property].default)) return;
				if (!fieldsToShow[property] && props.schema.properties[property] && additionalFields[property] !== false) {
					fieldsToShow[property] = props.schema.properties[property];
				}
			});
		}

		schema = {...schema, properties: fieldsToShow};

		if (generatedUiSchema["ui:order"]) {
			generatedUiSchema["ui:order"] = generatedUiSchema["ui:order"].filter(field => schema.properties[field] || field === "*");
			if (!generatedUiSchema["ui:order"].includes("*")) {
				generatedUiSchema["ui:order"] = [...generatedUiSchema["ui:order"], "*"];
			}
		}

		if (hasSetLocation) {
			console.warn("ScopeField's glyphField fn 'setLocation' is deprecated and will be removed in the future. The functionality is separated to a new component function 'LocationChooserField', use it instead.");
			const locationFn = {
				"ui:field": "LocationChooserField",
				"ui:options": {
					geometryField,
					taxonField
				}
			};
			const uiFunctions = generatedUiSchema["ui:functions"]
				? isObject(generatedUiSchema["ui:functions"])
					? [generatedUiSchema["ui:functions"], locationFn]
					: [...generatedUiSchema["ui:functions"], locationFn]
				: [locationFn];
			generatedUiSchema = {
				...generatedUiSchema,
				"ui:functions": uiFunctions
			};
		}

		return {
			schema: schema,
			uiSchema: generatedUiSchema,
			additionalFields,
			defaultFields
		};
	}

	onToggleAdditionals = () => {
		this.setState({additionalsOpen: !this.state.additionalsOpen});
	}

	renderAdditionalsButton = () => {
		if (!this.state.includeAdditionalFieldsChooserButton || Object.keys(this.props.formData || {}).length === 0) return null;

		const {additionalsGroupingPath} = getUiOptions(this.props.uiSchema);

		let additionalProperties = {};
		Object.keys(this.props.schema.properties).forEach(property => {
			if (!this.state.schema.properties[property] ||
				(this.state.schema.properties[property] && this.state.additionalFields[property]))
				additionalProperties[property] = this.props.schema.properties[property];
		});

		const glyphButtons = this.renderGlyphFields();

		return [
			additionalsGroupingPath
				? this.renderFieldsModal(additionalProperties)
				: this.renderFieldsDropdown(additionalProperties),
			...(glyphButtons ? glyphButtons : [])
		];
	}

	renderFieldsDropdown(additionalProperties) {
		const onSelect = () => { 
			this.preventCloseDropdown = true;
		};

		const onToggle = (isOpen) => {
			if (!this.preventCloseDropdown) this.onToggleAdditionals(isOpen);
			this.preventCloseDropdown = false;
		};

		return (
			<div key="scope-additionals-dropdown">
				<Dropdown id={this.props.idSchema.$id + "-scope-field-dropdown"}
				          bsStyle="primary"
				          pullRight
				          open={this.state.additionalsOpen}
				          onSelect={onSelect}
				          onToggle={onToggle}>
					{this.renderFieldsButton("toggle")}
					<Collapse in={this.state.additionalsOpen} bsRole="menu">
						<DropdownMenu>
							{this.additionalPropertiesToList(additionalProperties, MenuItem)}
						</DropdownMenu>
					</Collapse>
				</Dropdown>
			</div>
		);
	}

	renderFieldsModal = (additionalProperties) => {
		const {translations} = this.props.formContext;

		let list = [];

		const options = getUiOptions(this.props.uiSchema);
		const {additionalsGroupingPath} = options;

		let groupTranslations = this.state.additionalsGroupsTranslations || {};

		const groups = additionalsGroupingPath ? parseJSONPointer(options, additionalsGroupingPath) : {};

		const additionalsPersistenceValue = this.getAdditionalPersistenceValue(this.props);
		let groupNames = Object.keys(groups);
		if (additionalsPersistenceValue) groupNames = groupNames.sort((a, b) => additionalsPersistenceValue.indexOf(b) - additionalsPersistenceValue.indexOf(a));

		groupNames.forEach(groupName => {
			let group = groups[groupName] || {};
			let groupFields = {};
			const {fields = [], additionalFields = []} = group;
			const additionalFieldsDict = dictionarify(additionalFields);
			let combinedFields = Object.keys({...dictionarify(fields), ...additionalFieldsDict});
			combinedFields.forEach(field => {
				if (additionalProperties[field]) {
					groupFields[field] = additionalProperties[field];
				} else if (additionalFieldsDict[field]) {
					groupFields[field] = this.props.schema.properties[field];
				}
			});
			let groupsList = this.additionalPropertiesToList(groupFields, ListGroupItem);
			if (groupsList.length) {
				const someActive = Object.keys(groupFields).some(this.propertyIsIncluded);

				const onListGroupClick = () => {
					this.toggleAdditionalProperty(Object.keys(groupFields)
					    .filter(field => {return this.propertyIsIncluded(field) === someActive;}));
				};

				const listGroup = [
					(groupTranslations[groupName] !== undefined ? (
						<ListGroupItem key={groupName + "-list"} active={someActive} onClick={onListGroupClick}>
							<strong>{groupTranslations[groupName]}</strong>
						</ListGroupItem>
					) : <Spinner key={groupName + "-list"}/>),
					...groupsList
				];
				list.push(
					<div key={groupName} className="scope-field-modal-item">
						<ListGroup>{
							listGroup	
						}</ListGroup>
					</div>
				);
			}
		});

		if (this.state.additionalsOpen) this.modal = (
			<Modal key="fields-modal" show={true} onHide={this.onToggleAdditionals} dialogClassName="laji-form scope-field-modal">
				<Modal.Header closeButton={true}>
					<Modal.Title>{translations.SelectMoreFields}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{list}
				</Modal.Body>
			</Modal>
		);

		return this.renderFieldsButton();
	}

	renderFieldsButton = (bsRole) => {
		const tooltip = (
			<Tooltip id={`${this.props.idSchema.$id}-additionals-tooltip`}>
				{this.props.formContext.translations.SelectMoreFields}
			</Tooltip>
		);

		return (
			<OverlayTrigger key={`${this.props.idSchema.$id}-scope`} overlay={tooltip} placement="left" bsRole={bsRole} >
				<GlyphButton glyph="cog" onClick={this.onToggleAdditionals} id={`${this.props.idSchema.$id}-additionals`}/>
			</OverlayTrigger>
		);
	}

	renderGlyphFields = () => {
		const {glyphFields} = getUiOptions(this.props.uiSchema);
		const {idSchema} = this.props;

		return glyphFields ?
			glyphFields.filter(settings => !settings.fn || settings.fn !== "setLocation").map(settings => {
				const {glyph, label, show} = settings;
				if (show) {
					const property = show;
					const isIncluded = this.propertyIsIncluded(property);
					const hasData = propertyHasData(property, this.props.formData) && (!this.props.formData || !isDefaultData(this.props.formData[property], this.props.schema.properties[property], this.props.registry.definitions));

					const tooltip = <Tooltip id={`${idSchema.$id}-${property}-tooltip-${glyph}`}>{label}</Tooltip>;
					const onButtonClick = () => this.toggleAdditionalProperty(property);
					return (
						<OverlayTrigger key={property} overlay={tooltip} placement="left">
							<GlyphButton glyph={glyph}
													 disabled={hasData}
													 bsStyle={isIncluded ? "primary" : "default"}
													 onClick={onButtonClick}
							/>
						</OverlayTrigger>
					);
				}
			}) : null;
	}

	propertyIsIncluded = (property) => {
		const {additionalFields} = this.state;
		const isIncluded = additionalFields[property] === true || this.state.schema.properties[property];
		return !!isIncluded;
	}

	toggleAdditionalProperty = (fields) => {
		const {additionalsPersistenceField, additionalsPersistenceKey} = getUiOptions(this.props.uiSchema);
		if (!Array.isArray(fields)) fields = [fields];
		const additionalFields = fields.reduce((additionalFields, field) => {
			return {...additionalFields, [field]: !this.propertyIsIncluded(field)};
		}, this.state.additionalFields);

		if (this.context) {
			const additionalsPersistenceVal = this.getAdditionalPersistenceValue(this.props, !"don't include undefined");
			let contextEntry = this._context || {};
			if (additionalsPersistenceField) {
				let additionalsKeys = ((this.props.schema.properties[additionalsPersistenceField].type === "array") ?
						additionalsPersistenceVal :
						[additionalsPersistenceVal]);
				if (additionalsKeys.length === 0) additionalsKeys = ["undefined"];
				additionalsKeys.forEach(persistenceKey => {
					contextEntry[persistenceKey] = additionalFields;
				});
				this.getContext()[`scopeField_${additionalsPersistenceKey}`] = contextEntry;
			} else if (additionalsPersistenceKey) {
				this.getContext()[`scopeField_${additionalsPersistenceKey}`] = additionalFields;
			}
		}
		this.setState({additionalFields, ...this.getSchemasAndAdditionals(this.props, {...this.state, additionalFields})});
	}


	additionalPropertiesToList = (properties, ElemType) => {
		const titles = getUiOptions(this.props.uiSchema).titles || {};
		return Object.keys(properties)
			.map(property => {
				const isIncluded = this.propertyIsIncluded(property);
				const hasData = propertyHasData(property, this.props.formData) && (!this.props.formData || !isDefaultData(this.props.formData[property], this.props.schema.properties[property], this.props.registry.definitions));
				const onClick = () => this.toggleAdditionalProperty(property);
				return (
					<ElemType
						key={property}
						disabled={hasData}
						active={isIncluded}
						onClick={onClick}>
						{titles[property] || properties[property].title || property}
					</ElemType>
				);
			});
	}

	translateAdditionalsGroups = (props) => {
		let options = getUiOptions(props.uiSchema);
		const {additionalsGroupingPath, additionalsGroupsTranslator} = options;
		if (!additionalsGroupingPath) return;
		const groups = parseJSONPointer(options, additionalsGroupingPath);
		const groupNames = Object.keys(groups).filter(groupName => !isNullOrUndefined(groups[groupName]));

		let translations = {};
		let translationsToKeys = {};
		let translationCount = 0;
		groupNames.forEach(groupName => {
			const title = groups[groupName].title;

			const promise = (!isNullOrUndefined(title)) ?
				new Promise(resolve => resolve(title)) :
				scopeFieldSettings[additionalsGroupsTranslator].translate(props, groupName);

			promise.then(translation => {
				translations[groupName] = translation;
				translationsToKeys[translation] = groupName;
				translationCount++;
				if (this.mounted && translationCount == groupNames.length) {
					this.setState({
						additionalsGroupsTranslations: translations,
						additionalsGroupsTranslationsToKeys: translationsToKeys
					});
				}
			});
		});
	}
}

new Context("SCHEMA_FIELD_WRAPPERS").ScopeField = true;
