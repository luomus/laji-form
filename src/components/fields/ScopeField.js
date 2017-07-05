import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import merge from "deepmerge";
import { ListGroup, ListGroupItem, Modal, Dropdown, MenuItem, OverlayTrigger, Tooltip, Collapse } from "react-bootstrap";
import Spinner from "react-spinner";
import ApiClient from "../../ApiClient";
import { GlyphButton } from "../components";
import { propertyHasData, hasData, isDefaultData, getUiOptions, getInnerUiSchema, parseJSONPointer, isNullOrUndefined } from "../../utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import { Map } from "./MapArrayField";

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

const buttonSettings = {
	setLocation: (that, {glyph, label}) => {
		const id = that.props.idSchema.$id;
		const tooltip = <Tooltip id={`${id}-$tooltip-${glyph}`}>{label}</Tooltip>;

		const hasCoordinates = hasData(that.props.formData["/unitGathering/geometry"]);

		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);

		function getLayer(map) {
			const {$id} = that.props.idSchema;
			const splitted = $id.split("_");
			const idx = parseInt(splitted[splitted.length - 1]);

			const {featureIdxsToItemIdxs} = new Context(`${that.props.formContext.contextId}_MAP_CONTAINER`);
			let featureIdx = undefined;
			for (let i in featureIdxsToItemIdxs) {
				if (featureIdxsToItemIdxs[i] === idx) {
					featureIdx = i;
					break;
				}
			}
			if (featureIdx === undefined) return;

			return map._getDrawLayerById(map.idxsToIds[featureIdx]);
		}

		let active = false;
		function onClick() {
			active = true;
			const {translations, contextId} = that.props.formContext;
			const {map} = mapContext;
			if (!map) return;

			let modalMap = undefined;
			let triggerLayer = undefined;

			const {rootElem, ...mapOptions} = map.getOptions(); //eslint-disable-line no-unused-vars
			that.setState({
				map: {
					...mapOptions,
					draw: {
						...map.draw,
						marker: true,
						polyline: false,
						rectangle: false,
						polygon: false,
						circle: false,
						onChange: events => {
							for (let event of events) {
								const {type} = event;
								switch (type) {
								case "create":
									that.props.onChange(update(
											that.props.formData,
											{$merge: {["/unitGathering/geometry"]: event.feature.geometry}}
										));
									close();
									break;
								case "delete":
								case "edit":
									map.draw.onChange([event]);
								}
							}
						}
					},
					onComponentDidMount: (map) => {
						modalMap = map;
						triggerLayer = modalMap.triggerDrawing("marker");
						const layer = getLayer(modalMap);
						if (layer) {
							layer.bindTooltip(translations.CurrentLocation, {permanent: true}).openTooltip();
							modalMap.updateLayerStyle(layer, {opacity: 0.7});
						}
					}
				}
			});


			function close() {
				triggerLayer.disable();
				that.setState({map: undefined});
			}
		}

		let layer = undefined;
		function onMouseEnter() {
			const {map} = mapContext;
			layer = getLayer(map);
			if (!layer) return;

			let latlng = undefined;
			for (let fn of ["getLatLng", "getCenter"]) {
				if (layer[fn]) latlng = layer[fn]();
			}
			map.updateLayerStyle(layer, {color: "#75CEFA"});

			if (!latlng) return;
			layer.fire("mouseover", {latlng});
			if (!map.map.getBounds().contains(latlng)) {
				map.map.setView(latlng);
			}
		}

		function onMouseLeave() {
			if (active || !layer) return;
			const {map} = mapContext;
			map.updateLayerStyle(layer, {color: "#55AEFA"});
			layer.fire("mouseout");
		}

		return (
			<OverlayTrigger key={`${id}-set-coordinates-${glyph}`} overlay={tooltip} placement="left" >
					<GlyphButton
						bsStyle={hasCoordinates ? "primary" : "default"}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						glyph={glyph}
						onClick={onClick} />
			</OverlayTrigger>
		);
	}
};

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
@BaseComponent
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

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;

		const {additionalsGroupingPath} = getUiOptions(this.props.uiSchema);

		const uiSchema = {...this.state.uiSchema, "ui:buttons": [...(this.state.uiSchema["ui:buttons"] || []), this.renderAdditionalsButton()]};
		const {translations} = this.props.formContext;
		const onHide = () => this.setState({map: undefined});

		return (
			<div>
				<SchemaField {...this.props} {...this.state} uiSchema={uiSchema} />
				{this.state.additionalsOpen && additionalsGroupingPath ? this.modal : null}
				{this.state.map ? (
					<Modal show={true} dialogClassName="laji-form map-dialog" onHide={onHide}>
						<Modal.Header closeButton={true} closeLabel={translations.Cancel} >
							<Modal.Title>{translations.SetLocationToUnit}</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<Map {...this.state.map} />
						</Modal.Body>
					</Modal>
				) : null}
			</div>
		);
	}

	componentDidUpdate(nextProps) {
		if (!this.state.additionalsGroupsTranslations || nextProps.formContext.lang !== this.props.formContext.lang ||
			getUiOptions(nextProps.uiSchema).additionalsGroupsTranslator !== getUiOptions(this.props.uiSchema).additionalsGroupsTranslator) {
			this.translateAdditionalsGroups(nextProps);
		}
	}

	getStateFromProps(props) {
		const options = getUiOptions(props.uiSchema);

		const includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;

		let state = {
			includeAdditionalFieldsChooserButton
		};

		const {additionalsPersistenceKey, additionalsPersistenceId} = getUiOptions(props.uiSchema);
		let additionalFields = additionalsPersistenceKey ? {} : (this.state ? this.state.additionalFields : {});

		if (additionalsPersistenceId) {
			const mainContext = this.getContext();
			this._context = mainContext[ `scopeField_${additionalsPersistenceId}`];
		}

		if (this._context) {
			let additionalsToAdd = {};
			if (additionalsPersistenceKey) {
				const formDataItem = props.formData[additionalsPersistenceKey];
				let items = (Array.isArray(formDataItem) ? formDataItem : [formDataItem]);
				if (items.length === 0) items = ["undefined"];
				items.forEach(item => {
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
		let additionalFields = (state && state.additionalFields) ? Object.assign({}, state.additionalFields) : {};

		let options = getUiOptions(uiSchema);
		let generatedUiSchema = getInnerUiSchema(uiSchema);

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
				fieldScope = {...fieldScope, refs: undefined};
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
				addFieldScopeFieldsToFieldsToShow(fieldScope);
			}
		}
		
		function addFieldScopeFieldsToFieldsToShow(fieldScope) {
			if (!fieldScope) return;
			let scopes = fieldScope.fieldScopes;

			if (scopes) Object.keys(scopes).forEach(fieldSelector => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValues = formData[fieldSelector];
				if (!Array.isArray(fieldSelectorValues)) fieldSelectorValues = [fieldSelectorValues];
				if (fieldSelectorValues.length > 0 && hasData(fieldSelectorValues[0]) && !isDefaultData(fieldSelectorValues[0], schema.properties[fieldSelector], props.registry.definitions)) {
					fieldSelectorValues = ["+", ...fieldSelectorValues];
				}
				fieldSelectorValues = ["*", ...fieldSelectorValues];
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (hasData(fieldSelectorValue) && !isDefaultData(fieldSelectorValue, schema.properties[fieldSelector], props.registry.definitions)) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}

		addFieldScopeFieldsToFieldsToShow(options);

		if (additionalFields) {
			Object.keys(additionalFields).filter(field => additionalFields[field]).forEach((property) => {
				fieldsToShow[property] = props.schema.properties[property];
			});
		}

		if (props.formData) {
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

		return {
			schema: schema,
			uiSchema: generatedUiSchema,
			additionalFields
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
			additionalsGroupingPath ? this.renderFieldsModal(additionalProperties) : this.renderFieldsDropdown(additionalProperties),
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
			<Dropdown key="socop"
			          id={this.props.idSchema.$id + "-scope-field-dropdown"}
			          bsStyle="primary"
			          pullRight
			          open={this.state.additionalsOpen}
			          onSelect={onSelect}
			          onToggle={onToggle}>
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
		const {additionalsGroupingPath, additionalsGroupingOrderer} = options;

		let groupTranslations = this.state.additionalsGroupsTranslations || {};

		const groups = additionalsGroupingPath ? parseJSONPointer(options, additionalsGroupingPath) : undefined;

		let groupNames = Object.keys(groups);
		if (additionalsGroupingOrderer && this.props.formData) {
			const orderer = this.props.formData[additionalsGroupingOrderer];
			if (orderer) groupNames = groupNames.sort((a, b) => orderer.indexOf(b) - orderer.indexOf(a));
		}

		groupNames.forEach(groupName => {
			let group = groups[groupName] || {};
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
			<Modal show={true} onHide={this.onToggleAdditionals} dialogClassName="laji-form scope-field-modal">
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
			<OverlayTrigger key={`${this.props.idSchema.$id}-test`} overlay={tooltip} placement="left" bsRole={bsRole} >
				<GlyphButton glyph="cog" onClick={this.onToggleAdditionals} />
			</OverlayTrigger>
		);
	}

	renderGlyphFields = () => {
		const {glyphFields} = getUiOptions(this.props.uiSchema);
		const {idSchema} = this.props;

		return glyphFields ?
		glyphFields.map(settings => {
			const {glyph, label} = settings;
			if (settings.show) {
				const property = settings.show;
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
			} else if (settings.fn) {
				return buttonSettings[settings.fn](this, settings);
			}
		}) : null;
	}

	propertyIsIncluded = (property) => {
		const {additionalFields} = this.state;
		const isIncluded = !!(additionalFields[property] === true || this.state.schema.properties[property]);
		return isIncluded;
	}


	toggleAdditionalProperty = (fields) => {
		if (!Array.isArray(fields)) fields = [fields];
		const additionalFields = fields.reduce((additionalFields, field) => {
			return {...additionalFields, [field]: !this.propertyIsIncluded(field)};
		}, this.state.additionalFields);

		if (this.context) {
			const {additionalsPersistenceKey, additionalsPersistenceId} = getUiOptions(this.props.uiSchema);
			const additionalsPersistenceVal = this.props.formData[additionalsPersistenceKey];
			let contextEntry = this._context || {};
			if (additionalsPersistenceKey) {
				let additionalsKeys = ((this.props.schema.properties[additionalsPersistenceKey].type === "array") ?
						additionalsPersistenceVal :
						[additionalsPersistenceVal]);
				if (additionalsKeys.length === 0) additionalsKeys = ["undefined"];
				additionalsKeys.forEach(persistenceKey => {
					contextEntry[persistenceKey] = additionalFields;
				});
				this.getContext()[ `scopeField_${additionalsPersistenceId}`] = contextEntry;
			} else if (additionalsPersistenceId) {
				this.getContext()[ `scopeField_${additionalsPersistenceId}`] = additionalFields;
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

new Context("VIRTUAL_SCHEMA_NAMES").ScopeField = true;
