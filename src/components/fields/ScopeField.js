import * as React from "react";
import * as PropTypes from "prop-types";
import * as merge from "deepmerge";
const equals = require("deep-equal");
import * as Spinner from "react-spinner";
import { GlyphButton } from "../components";
import { propertyHasData, hasData, isDefaultData, getUiOptions, getInnerUiSchema, parseJSONPointer, isNullOrUndefined, dictionarify, isObject } from "../../utils";
import Context from "../../Context";
import ReactContext from "../../ReactContext";
import BaseComponent from "../BaseComponent";
import { computeUiSchema } from "./ConditionalUiSchemaField";
import { orderProperties } from "@rjsf/utils";

const scopeFieldSettings = {
	taxonGroups: {
		translate: (props, taxonGroup) => {
			return props.formContext.apiClient.fetchCached("/informal-taxon-groups/" + taxonGroup).then((response) => {
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
export default class ScopeField extends React.Component {
	static contextType = ReactContext;
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

		const {additionalsGroupingPath} = getUiOptions(this.props.uiSchema);

		let uiSchema = {
			...this.state.uiSchema, 
			"ui:buttons": [
				...(this.props.uiSchema["ui:buttons"] || []),
				...this.renderAdditionalsButtons()
			]
		};

		const addButton = button => {
			uiSchema = {
				...uiSchema,
				"ui:buttons": [
					...uiSchema["ui:buttons"],
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
		if (this.state.additionalsOpen
			&& (
				!this.state.additionalsGroupsTranslations || prevProps.formContext.lang !== this.props.formContext.lang ||
				getUiOptions(prevProps.uiSchema).additionalsGroupsTranslator !== getUiOptions(this.props.uiSchema).additionalsGroupsTranslator
			)) {
			this.translateAdditionalsGroups(this.props);
		}
		if (!equals(prevState.fieldsToShow, this.state.fieldsToShow)) {
			this.context.utils.syncScroll();
			const context = new Context(this.props.formContext.contextId);
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
		Object.keys(additionalFields).forEach(key => {
			if (!props.schema.properties[key]) {
				delete additionalFields[key];
			}
		});
		let defaultFields = (state && state.defaultFields) ? {...state.defaultFields} : {};

		const options = getUiOptions(uiSchema);
		let {fields, definitions, glyphFields = [], geometryField = "unitGathering_geometry", taxonField} = options;
		let generatedUiSchema = getInnerUiSchema(uiSchema);

		let fieldsToShow = {};

		(fields || []).forEach(field => {
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
				let fieldSelectorValues = formData[fieldSelector];
				if (!fieldSelectorValues || Array.isArray(fieldSelectorValues) && !fieldSelectorValues.length) {
					fieldSelectorValues = that.getAdditionalPersistenceValue(props);
				}
				if (!Array.isArray(fieldSelectorValues)) fieldSelectorValues = [fieldSelectorValues];
				if (scopes[fieldSelector]["+"] && fieldSelectorValues.length > 0 && fieldSelectorValues.some(_fieldSelectorValue => _fieldSelectorValue !== "undefined" && hasData(_fieldSelectorValue) && !isDefaultData(_fieldSelectorValue, schema.properties[fieldSelector]))) {
					addFieldSelectorsValues(scopes, fieldSelector, "+");
				}
				if (scopes[fieldSelector]["*"]) {
					addFieldSelectorsValues(scopes, fieldSelector, "*");
				}
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (hasData(fieldSelectorValue) && !isDefaultData(fieldSelectorValue, schema.properties[fieldSelector].type === "array" ? schema.properties[fieldSelector].items : schema.properties[fieldSelector])) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}

		function findScopedFields(fieldScope = {}, _fields = {}) {
			const {fields =[], additionalFields = [], fieldScopes = {}} = fieldScope;
			[...fields, ...additionalFields].forEach(f => {
				_fields[f] = true;
			});
			Object.keys(fieldScopes).forEach(f => Object.keys(fieldScopes[f]).forEach(_f => findScopedFields(fieldScopes[f][_f], _fields)));
			return _fields;
		}

		// If no root fields defined, show all fields that aren't in any scopes' fields or additional fields.
		if (!fields) {
			const scopedFields = findScopedFields(options);
			glyphFields.forEach(({show, open}) => {
				if (open === false) {
					scopedFields[show] = true;
				}
			});
			fieldsToShow = Object.keys(props.schema.properties).reduce((_fields, f) => {
				if (!scopedFields[f]) {
					_fields[f] = props.schema.properties[f];
				}
				return _fields;
			}, {});
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
				if (!schema.properties[property]) return;
				const isDefault = isDefaultData(formData[property], schema.properties[property]);
				if (!isDefault) {
					fieldsToShow[property] = props.schema.properties[property];
				}
			});
		}

		Object.keys(schema.properties).forEach(prop => {
			if (!fieldsToShow[prop]) {
				generatedUiSchema[prop] = {"ui:field": "HiddenField"};
			}
		});

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
			defaultFields,
			fieldsToShow
		};
	}

	onToggleAdditionals = () => {
		this.setState({additionalsOpen: !this.state.additionalsOpen});
	}

	renderAdditionalsButtons = () => {
		const glyphButtons = this.renderGlyphFields();
		if (!this.state.includeAdditionalFieldsChooserButton || Object.keys(this.props.formData || {}).length === 0) {
			if (glyphButtons) {
				return glyphButtons;
			}
			return [];
		}

		const {additionalsGroupingPath} = getUiOptions(this.props.uiSchema);

		let additionalProperties = {};
		Object.keys(this.props.schema.properties).forEach(property => {
			if (!this.state.fieldsToShow[property] ||
				(this.state.fieldsToShow[property] && this.state.additionalFields[property]))
				additionalProperties[property] = this.props.schema.properties[property];
		});


		return [
			additionalsGroupingPath
				? this.renderFieldsModal(additionalProperties)
				: this.renderFieldsDropdown(additionalProperties),
			...(glyphButtons ? glyphButtons : [])
		];
	}

	onSelect = () => { 
		this.preventCloseDropdown = true;
	}

	onToggle = (isOpen) => {
		if (!this.preventCloseDropdown) this.onToggleAdditionals(isOpen);
		this.preventCloseDropdown = false;
	}


	renderFieldsDropdown(additionalProperties) {
		const {MenuItem, Glyphicon, Dropdown} = this.context.theme;
		return (
			<div key="scope-additionals-dropdown">
				<Dropdown pullRight id={this.props.idSchema.$id + "-additionals"} open={this.state.additionalsOpen} onToggle={this.onToggle}>
					<Dropdown.Toggle noCaret variant="primary">
						<Glyphicon glyph="cog" />
					</Dropdown.Toggle>
					<Dropdown.Menu onSelect={this.onSelect}>
						{this.additionalPropertiesToList(additionalProperties, MenuItem)}
					</Dropdown.Menu>
				</Dropdown>
			</div>
		);
	}

	renderFieldsModal = (additionalProperties) => {
		const {translations} = this.props.formContext;

		let list = [];

		const options = getUiOptions(this.props.uiSchema);
		const {additionalsGroupingPath} = options;

		let groupTranslations = this.state.additionalsGroupsTranslations;

		const groups = additionalsGroupingPath ? parseJSONPointer(options, additionalsGroupingPath) : {};

		const additionalsPersistenceValue = this.getAdditionalPersistenceValue(this.props);
		let groupNames = Object.keys(groups);
		if (additionalsPersistenceValue) groupNames = groupNames.sort((a, b) => additionalsPersistenceValue.indexOf(b) - additionalsPersistenceValue.indexOf(a));

		groupNames.forEach(groupName => {
			list.push(<_ListGroup
				key={groupName}
				group={groups[groupName]}
				groupName={groupName}
				groupTranslations={groupTranslations}
				additionalProperties={additionalProperties}
				additionalPropertiesToList={this.additionalPropertiesToList}
				propertyIsIncluded={this.propertyIsIncluded}
				schema={this.props.schema}
				toggleAdditionalProperty={this.toggleAdditionalProperty}
			/>);
		});

		const {Modal} = this.context.theme;
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
		const {OverlayTrigger, Tooltip} = this.context.theme;
		const tooltip = (
			<Tooltip id={`${this.props.idSchema.$id}-additionals-tooltip`}>
				{this.props.formContext.translations.SelectMoreFields}
			</Tooltip>
		);

		return (
			<OverlayTrigger key={`${this.props.idSchema.$id}-scope`} overlay={tooltip} placement="left" bsRole={bsRole} >
				<GlyphButton glyph="cog" onClick={this.onToggleAdditionals} id={`${this.props.idSchema.$id}-additionals`} variant="primary" />
			</OverlayTrigger>
		);
	}

	renderGlyphFields = () => {
		const {glyphFields} = getUiOptions(this.props.uiSchema);

		return glyphFields ?
			glyphFields.filter(settings => !settings.fn || settings.fn !== "setLocation").map((settings, i) => 
				<GlyphField key={i}
				            settings={settings}
				            idSchema={this.props.idSchema}
				            formData={this.props.formData}
				            schema={this.props.schema}
				            registry={this.props.registry}
				            isIncluded={this.propertyIsIncluded(settings.show)}
				            toggleAdditionalProperty={this.toggleAdditionalProperty}
				/>
			) : null;
	}

	propertyIsIncluded = (property) => {
		const {additionalFields} = this.state;
		const isIncluded = additionalFields[property] === true || this.state.fieldsToShow[property];
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
				let additionalsKeys = this.props.schema.properties[additionalsPersistenceField].type === "array"
					? additionalsPersistenceVal
					: [additionalsPersistenceVal];
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
		return orderProperties(Object.keys(properties), this.props.uiSchema["ui:order"])
			.map(property => {
				const isIncluded = this.propertyIsIncluded(property);
				const hasData = propertyHasData(property, this.props.formData) && (!this.props.formData || !isDefaultData(this.props.formData[property], this.props.schema.properties[property]));
				if (!this.propertyTogglers) {
					this.propertyTogglers = {};
				}
				if (!this.propertyTogglers[property]) {
					this.propertyTogglers[property] = () => this.toggleAdditionalProperty(property);
				}
				return (
					<ElemType
						key={property}
						disabled={hasData}
						active={isIncluded}
						onClick={this.propertyTogglers[property]}>
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

const getGroupFields = (group, additionalProperties, schema) => {
	const {fields = [], additionalFields = []} = group;
	const additionalFieldsDict = dictionarify(additionalFields);
	let combinedFields = Object.keys({...dictionarify(fields), ...additionalFieldsDict});
	let groupFields = {};
	combinedFields.forEach(field => {
		if (additionalProperties[field]) {
			groupFields[field] = additionalProperties[field];
		} else if (additionalFieldsDict[field]) {
			groupFields[field] = schema.properties[field];
		}
	});
	return groupFields;
};

const _ListGroup = React.memo(function _ListGroup({group = {}, groupTranslations = {}, additionalProperties, groupName, additionalPropertiesToList, propertyIsIncluded, schema, toggleAdditionalProperty}) {
	const groupFields = React.useMemo(() => getGroupFields(group, additionalProperties, schema), [group, additionalProperties, schema]);
	const {ListGroupItem, ListGroup} = React.useContext(ReactContext).theme;
	let groupsList = additionalPropertiesToList(groupFields, ListGroupItem);

	const someActive = Object.keys(groupFields).some(propertyIsIncluded);

	const onListGroupClick = React.useCallback(() => {
		toggleAdditionalProperty(Object.keys(groupFields)
			.filter(field => {return propertyIsIncluded(field) === someActive;}));
	}, [toggleAdditionalProperty, groupFields, propertyIsIncluded, someActive]);

	if (!groupsList.length) {
		return null;
	}

	const listGroup = [
		<ListGroupItem key={groupName + "-list"} active={someActive} onClick={onListGroupClick}>{
			groupTranslations[groupName] !== undefined
				? <strong>{groupTranslations[groupName]}</strong>
				: <Spinner key={groupName + "-list"}/>
		}</ListGroupItem>,
		...groupsList
	];
	return (
		<div key={groupName} className="scope-field-modal-item">
			<ListGroup>{listGroup}</ListGroup>
		</div>
	);
});

function GlyphField({settings, idSchema, formData, schema, registry, isIncluded, toggleAdditionalProperty}) {
	const {glyph, label, show} = settings;
	const property = show;
	const onButtonClick = React.useCallback(() => toggleAdditionalProperty(property), [property, toggleAdditionalProperty]);
	const {Tooltip, OverlayTrigger} = React.useContext(ReactContext).theme;

	if (!show) {
		return null;
	}
	const hasData = propertyHasData(property, formData) && (!formData || !isDefaultData(formData[property], schema.properties[property]));

	const tooltip = <Tooltip id={`${idSchema.$id}-${property}-tooltip-${glyph}`}>{label}</Tooltip>;
	
	return (
		<OverlayTrigger key={property} overlay={tooltip} placement="left">
			<GlyphButton glyph={glyph}
									 disabled={hasData}
									 active={isIncluded}
									 onClick={onButtonClick} />
		</OverlayTrigger>
	);
}

new Context("SCHEMA_FIELD_WRAPPERS").ScopeField = true;
