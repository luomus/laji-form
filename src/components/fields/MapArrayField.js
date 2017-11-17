import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import update from "immutability-helper";
import deepEquals from "deep-equal";
import merge from "deepmerge";
import LajiMap from "laji-map/lib/map";
import { latLngSegmentsToGeoJSONGeometry } from "laji-map/lib/utils";
import { Row, Col, Panel, Popover } from "react-bootstrap";
import { Button, StretchAffix, Stretch } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, immutableDelete, getTabbableFields, getSchemaElementById, getBootstrapCols, focusById, isNullOrUndefined, parseJSONPointer, getUpdateObjectFromJSONPath } from "../../utils";
import { getDefaultFormState, toIdSchema } from "react-jsonschema-form/lib/utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import { getPropsForFields } from "./NestField";
import { getButton } from "../ArrayFieldTemplate";

const popupMappers = {
	unitTaxon: (schema, formData, options = {}) => {
		try {
			return {[schema.identifications.items.properties.taxon.title]: parseJSONPointer(formData, options.valuePath, !!"safe mode")};
		} catch (e) {
			return {};
		}
	}
};

function parseGeometries(geometry) {
	return ((geometry && geometry.type === "GeometryCollection") ? geometry.geometries : [geometry])
		.filter(geometry => geometry)
		.reduce((geometries, _geometry) => {
			if (geometry.type === "GeometryCollection") {
				geometries = [...geometries, ...parseGeometries(_geometry)];
			} else if ("type" in geometry) {
				geometries.push(geometry);
			}
			return geometries;
		}, []);
}


export default class MapArrayField extends Component {
	render() {
		const {geometryMapper = "default"} = getUiOptions(this.props.uiSchema);
		switch (geometryMapper) {
		case "default":
			return <DefaultMapArrayField {...this.props} />;
		case "units":
			return <UnitsMapArrayField {...this.props} />;
		case "lineTransect":
			return <LineTransectMapArrayField {...this.props} />;
		}
	}
}

@_MapArrayField
class DefaultMapArrayField extends Component {
	constructor(props) {
		super(props);
		this.onMapChangeCreateGathering = this.onMapChangeCreateGathering.bind(this);
		this.onChange = this.onChange.bind(this);
	}
	getOptions(options) {
		const {formData} = this.props;
		const geometries = this.getData();

		const emptyMode = !formData || !formData.length;

		const draw = (options.draw === false || (isNullOrUndefined(this.state.activeIdx) && !emptyMode)) ? false : {
			featureCollection: {
				type: "FeatureCollection",
				features: (geometries || []).map(geometry => {
					return {type: "Feature", properties: {}, geometry};
				})
			},
			getDraftStyle: this.getDraftStyle,
			onChange: emptyMode ? this.onMapChangeCreateGathering : this.onChange,
			...(options.draw && options.draw.constructor === Object && options.draw !== null ? options.draw : {})
		};


		const controls = (emptyMode || this.state.activeIdx !== undefined) ?
			{drawCopy: true} : {draw: false, coordinateInput: false};

		return {draw, controls, emptyMode};
	}

	onMapChangeCreateGathering(events) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		events.forEach(e => {
			if (e.type === "create") {
				const formData = getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions);
				formData[geometryField] = {
					type: "GeometryCollection",
					geometries: [e.feature.geometry]
				};
				this.props.onChange([formData]);
				this.setState({activeIdx: 0}, () => {
					const node = getSchemaElementById(this.props.formContext.contextId, `${this.props.idSchema.$id}_0`);
					if (!node) return;
					const tabbables = getTabbableFields(node);
					if (tabbables && tabbables.length) tabbables[0].focus();
				});
			}
		});
	}

	getData() {
		const {formData} = this.props;
		const idx = this.state.activeIdx;
		const {geometryField} = getUiOptions(this.props.uiSchema);
		if (!formData) return;

		const item = formData[idx];
		this._context.featureIdxsToItemIdxs = {};

		let geometries = [];
		if (idx !== undefined && item && item[geometryField] && item[geometryField].type) {
			geometries = parseGeometries(item[geometryField]);
		}

		return geometries;
	}

	onChange(events) {
		events.forEach(e => {
			switch (e.type) {
			case "create":
				this.onAdd(e);
				break;
			case "delete":
				this.onRemove(e);
				break;
			case "edit":
				this.onEdited(e);
				break;
			}
		});
	}

	onAdd({feature: {geometry}}) {
		const formData = this.props.formData ||
			[getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)];
		const {geometryField} = getUiOptions(this.props.uiSchema);

		const itemFormData = formData[this.state.activeIdx];
		this.props.onChange(update(formData,
			{[this.state.activeIdx]: {$merge: {[geometryField]: {type: "GeometryCollection", geometries: [
				...parseGeometries(itemFormData[geometryField]), geometry
			]}}}}));
	}

	onRemove({idxs}) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		let splices = [];
		idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		const item = this.props.formData[this.state.activeIdx];
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {[geometryField]: item[geometryField] && item[geometryField].type === "GeometryCollection" ?
				{geometries: {$splice: splices}} : {$set: undefined}}}));
	}

	onEdited({features}) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {[geometryField]: {
				geometries: Object.keys(features).reduce((obj, idx) => {
					obj[idx] = {$set: features[idx].geometry};
					return obj;
				}, {})
			}}}));
	}
}

@_MapArrayField
class UnitsMapArrayField extends Component {
	field = "units"

	constructor(props) {
		super(props);
		this.onMapChangeCreateGathering = DefaultMapArrayField.prototype.onMapChangeCreateGathering.bind(this);
		this.onChange = DefaultMapArrayField.prototype.onChange.bind(this);
		this.onAdd = DefaultMapArrayField.prototype.onAdd.bind(this);
		this.onRemove = DefaultMapArrayField.prototype.onRemove.bind(this);
		this.onEdited = DefaultMapArrayField.prototype.onEdited.bind(this);
	}

	getOptions = (options) => {
		const {formData} = this.props;
		const {gatherings = [], units = []} = this.getData();

		const emptyMode = !formData || !formData.length;

		const draw = (options.draw === false || (isNullOrUndefined(this.state.activeIdx) && !emptyMode)) ? false : {
			featureCollection: {
				type: "FeatureCollection",
				features: gatherings.map(geometry => {
					return {type: "Feature", properties: {}, geometry};
				})
			},
			getDraftStyle: this.getDraftStyle,
			onChange: emptyMode ? this.onMapChangeCreateGathering : this.onChange,
			...(options.draw && options.draw.constructor === Object && options.draw !== null ? options.draw : {})
		};

		const data = {
			featureCollection: {
				type: "FeatureCollection",
				features: units.reduce((units, geometry, idx) => {
					if (geometry) units.push({type: "Feature", properties: {idx}, geometry});
					return units;
				}, [])
			},
			getPopup: this.getPopup,
			getFeatureStyle: this.getUnitFeatureStyle,
			getDraftStyle: this.getDraftStyle,
			editable: true,
			onChange: this.onUnitChange,
		};

		this.unitFeatures = data.featureCollection.features;

		const controls = (emptyMode || !isNullOrUndefined(this.state.activeIdx)) ?
			{drawCopy: true} : {draw: false, coordinateInput: false};

		return {draw, data, controls, emptyMode};
	}

	getData = () => {
		const {formData} = this.props;
		const idx = this.state.activeIdx;
		if (!formData) return;

		const item = formData[idx];

		const gatherings = DefaultMapArrayField.prototype.getData.call(this);

		const units = ((item && item.units) ? item.units : []).reduce((units, unit, idx) => {
			if (unit.unitGathering) {
				const {unitGathering: {geometry}} = unit;
				if (geometry && hasData(geometry)) {
					units[idx] = geometry;
				}
				return units;
			}
		}, []);
		return {gatherings, units};
	}

	onUnitChange = (events) => {
		events.forEach(e => {
			switch (e.type) {
			case "delete":
				this.onUnitRemove(e);
				break;
			case "edit":
				this.onUnitEdited(e);
				break;
			}
		});
	}

	onUnitRemove = (e) => {
		const idxs = e.idxs.map(idx => this.unitFeatures[idx].properties.idx);
		const {formData} = this.props;

		const unitIdxs = idxs;

		let splices = [];
		idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});

		let updateObject = {[this.state.activeIdx]: {
			units: unitIdxs.reduce((obj, idx) => {
				obj[idx] = {
					unitGathering: {
						geometry: {
							$set: getDefaultFormState(
								this.props.schema.items.properties.units.items.properties.unitGathering.properties.geometry,
								undefined,
								this.props.registry.definitions
							)
						}
					}
				};
				return obj;
			}, {})
		}};

		this.props.onChange(update(formData, updateObject));
	}

	onUnitEdited = ({features}) => {
		const unitEditGeometries = Object.keys(features).reduce((unitEditGeometries, idx) => {
			unitEditGeometries[features[idx].properties.idx] = features[idx].geometry;
			return unitEditGeometries;
		}, {});

		const updateObject = {
			[this.state.activeIdx]: {
				units: Object.keys(unitEditGeometries).reduce((o, i) => {
					o[i] = {unitGathering: {geometry: {$set: unitEditGeometries[i]}}};
					return o;
				}, {})
			}
		};

		this.props.onChange(update(this.props.formData, updateObject));
	}

	onComponentDidUpdate = () => {
		if (this.highlightedElem) {
			this.highlightedElem.className = this.highlightedElem.className.replace(" map-highlight", "");
		}

		const {popupIdx} = this.state;
		if (popupIdx === undefined) return;

		const idx = this._context.featureIdxsToItemIdxs[popupIdx];

		if (idx === undefined) {
			return;
		}

		const id = `_laji-form_${this.props.idSchema.$id}_${this.state.activeIdx}_units_${idx}`;
		this.highlightedElem = document.querySelector(`#${id} .form-group`);

		if (this.highlightedElem) {
			this.highlightedElem.className += " map-highlight";
		}
	}

	onActiveChange = idx => {
		if (idx === undefined) return;
		if (Object.keys(this.map.draw.group._layers).length) this.map.map.fitBounds(this.map.draw.group.getBounds());
	}
}

@_MapArrayField
class LineTransectMapArrayField extends Component {
	getOptions() {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		const {formData} = this.props;
		const lineTransect = latLngSegmentsToGeoJSONGeometry(formData.map(item => item.geometry.coordinates));
		return {
			lineTransect: {
				feature: {geometry: lineTransect},
				activeIdx: this.state.activeIdx,
				keepActiveTooltipOpen: true,
				onChange: (events) => {
					let state = {};
					let formData = this.props.formData;
					let formDataChanged = false;
					events.forEach(e => {
						switch (e.type) {
						case "create": {
							formDataChanged = true;
							const newItem = getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions);
							newItem[geometryField] = e.geometry;
							formData = update(formData, {
								$splice: [[e.idx, 0, newItem]]
							});
							break;
						}
						case "edit": {
							formDataChanged = true;
							formData = update(formData, {
								[e.idx]: {
									[geometryField]: {$set: e.geometry}
								}
							});
							break;
						}
						case "delete": {
							formDataChanged = true;
							formData = update(formData, {$splice: [[e.idx, 1]]});
							break;
						}
						case "active": {
							state.activeIdx = e.idx;
						}
						}
					});
					const afterState = () => {
						if (formDataChanged) {
							this.props.onChange(formData);
						}
					};
					Object.keys(state).length ?	this.setState(state, afterState()) : afterState();
				}
			},
			controls: {
				lineTransect: true
			}
		};
	}

	onActiveChange(idx) {
		this.getContext().setImmediate(() =>
			this.map.map.fitBounds(this.map._allCorridors[idx].getBounds(), {maxZoom: this.map._getDefaultCRSLayers().includes(this.map.tileLayer) ? 16 : 13})
		);
		this.map._openTooltipFor(idx);
		focusById(this.props.formContext.contextId, `${this.props.idSchema.$id}_${idx}`);
	}
	onComponentDidUpdate(prevProps, prevState) {
		if (prevState.activeIdx !== this.state.activeIdx) {
			this.onActiveChange(this.state.activeIdx);
		}
	}
	onComponentDidMount() {
		this.onActiveChange(this.state.activeIdx);
	}
}

function _MapArrayField(ComposedComponent) { return (
@BaseComponent
class _MapArrayField extends ComposedComponent {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				geometryField: PropTypes.string.isRequired,
				// allows custom algorithm for getting geometry data
				geometryMapper: PropTypes.oneOf(["default", "units", "lineTransect"]),
				topOffset: PropTypes.integer,
				bottomOffset: PropTypes.integer,
				popupFields: PropTypes.arrayOf(PropTypes.object),
				mapSizes: PropTypes.shape({
					lg: PropTypes.integer,
					md: PropTypes.integer,
					sm: PropTypes.integer,
					xs: PropTypes.integer
				})
			}).isRequired
		})
	}

	constructor(props) {
		super(props);
		this._context = new Context(`${props.formContext.contextId}_MAP_CONTAINER`);
		this._context.featureIdxsToItemIdxs = {};
		this._context.setState = (state, callback) => this.setState(state, callback);

		const initialState = {activeIdx: 0};
		const options = getUiOptions(props.uiSchema);
		if ("activeIdx" in options) initialState.activeIdx = options.activeIdx;
		this.state = initialState;
	}

	componentDidMount() {
		this.setState({mounted: true});
		this.getContext().addKeyHandler(`${this.props.idSchema.$id}`, this.mapKeyFunctions);
		this.map = this.refs.map.refs.map.map;
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "activeIdx", idx => {
			this.setState({activeIdx: idx}, () => focusById(this.props.formContext.contextId ,`${this.props.idSchema.$id}_${this.state.activeIdx}`));
		});

		if (this.onComponentDidMount) this.onComponentDidMount();
	}

	componentWillUnmount() {
		this.setState({mounted: false});
		this.getContext().removeKeyHandler(`${this.props.idSchema.$id}`, this.mapKeyFunctions);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "activeIdx");
	}

	componentDidUpdate(...params) {
		if (this.onComponentDidUpdate) this.onComponentDidUpdate(...params);
		if (this.refs.stretch) {
			const {resizeTimeout} = getUiOptions(this.props.uiSchema);
			if (resizeTimeout) {
				this.getContext().setTimeout(this.refs.stretch.update, resizeTimeout);
			} else {
				this.refs.stretch.update();
			}
		}
	}

	getContainer = () => {
		const belowSchema = !!getUiOptions(this.props.uiSchema).belowFields;
		return findDOMNode(belowSchema ? this.refs._stretch : this.refs.affix);
	}
	onResize = () => this.refs.map.map.map.invalidateSize({debounceMoveend: true})
	onPopupClose = () => this.setState({popupIdx: undefined})
	onFocusGrab = () => this.setState({focusGrabbed: true})
	onFocusRelease = () => this.setState({focusGrabbed: false})
	onOptionsChanged = (options) => this.setState({mapOptions: {...this.state.mapOptions, ...options}})
	getAligmentAnchor = () => this.refs._stretch

	render() {
		const {registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema, errorSchema, schema} = this.props;
		const options = getUiOptions(this.props.uiSchema);
		const {popupFields, geometryField, topOffset, bottomOffset, belowFields, propsToPassToInlineSchema = []} = options;
		let { belowUiSchemaRoot = {}, inlineUiSchemaRoot = {} } = options;
		const {activeIdx} = this.state;

		const activeIdxProps = {
			activeIdx,
			onActiveChange: (idx, callback) => {
				this.setState({activeIdx: idx}, () => {
					this.onActiveChange(idx);
					if (callback) callback();
				});
			}
		};
		uiSchema = {
			...getInnerUiSchema(uiSchema),
			"ui:options": {
				...getUiOptions(getInnerUiSchema(uiSchema)),
			}
		};

		let mapOptions = merge.all([
			(this.getOptions(options) || {}),
			(options.mapOptions || {}),
			(this.state.mapOptions || {})
		]);

		const mapSizes = options.mapSizes || getBootstrapCols(6);

		const schemaSizes = ["lg", "md", "sm", "xs"].reduce((sizes, size) => {
			sizes[size] = 12 - mapSizes[size] || 12;
			return sizes;
		}, {});

		const getChildProps = () => {
			return {
				schema: schema.items,
				uiSchema: uiSchema.items,
				idSchema: toIdSchema(
					schema.items,
					`${this.props.idSchema.$id}_${this.state.activeIdx}`,
					this.props.registry.definitions
				),
				formData: (this.props.formData || [])[this.state.activeIdx],
				errorSchema: this.props.errorSchema[this.state.activeIdx] || {},
				registry: this.props.registry,
				formContext: this.props.formContext
			};
		};

		const putChildsToParents = (props) => {
			return {
				schema: {...schema, items: props.schema},
				uiSchema: {...uiSchema, items: props.uiSchema},
				idSchema: this.props.idSchema,
				formData: update((this.props.formData || []), {$merge: {[this.state.activeIdx]: props.formData}}),
				errorSchema: props.errorSchema && Object.keys(props.errorSchema).length ? 
					update((this.props.errorSchema || []), {$merge: {[this.state.activeIdx]: props.errorSchema}}) : 
					this.props.errorSchema,
				onChange: formData => {
					this.props.onChange(formData.map((item, idx) => {
						return {
							...(this.props.formData[idx] || getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)), 
							...item
						};
					}));
				}
			};
		};

		const defaultProps = {...this.props, schema, uiSchema};
		const overrideProps = propsToPassToInlineSchema.reduce((_props, field) => {
			_props[field] = this.props[field];
			return _props;
		}, {});

		const inlineSchemaProps = putChildsToParents(getPropsForFields(getChildProps(), Object.keys(schema.items.properties).filter(field => !(belowFields || []).includes(field))));
		const belowSchemaProps = belowFields ? putChildsToParents(getPropsForFields(getChildProps(), belowFields)) : null;

		const inlineItemsUiSchema = {...uiSchema.items, ...inlineSchemaProps.uiSchema.items};
		let inlineUiSchema = {
			...inlineSchemaProps.uiSchema, 
		};
		if (inlineUiSchemaRoot) {
			inlineUiSchema = {...inlineUiSchema, ...inlineUiSchemaRoot};
			inlineUiSchema.items = {...inlineItemsUiSchema, ...(inlineUiSchemaRoot.items || {})};
		} else {
			inlineUiSchema.items = inlineItemsUiSchema;
		}

		let belowUiSchema =  belowSchemaProps ? {...belowSchemaProps.uiSchema, ...belowUiSchemaRoot} : undefined;

		inlineUiSchema = {...inlineUiSchema, "ui:options": {...(inlineUiSchema["ui:options"] || {}), ...activeIdxProps}};
		if (belowUiSchema) belowUiSchema = {...belowUiSchema, "ui:options": {...(belowUiSchema["ui:options"] || {}), ...activeIdxProps}};

		const {buttonsPath, addButtonPath, removeAddButtonPath} = getUiOptions(this.props.uiSchema);
		if (addButtonPath) console.warn("addButtonPath option for MapArrayField is deprecated - use buttonsPath instead!");
		let _buttonsPath = buttonsPath || addButtonPath;

		if (_buttonsPath && options.buttons) {
			let injectionTarget = false;
			try {
				injectionTarget =	parseJSONPointer(belowUiSchema, `${_buttonsPath}/ui:options`);
			} catch (e) {
				console.error("Invalid buttonsPath for MapArrayField");
			}

			if (injectionTarget) {
				const addButton = options.buttons.find(({fn}) => fn === "add");
				const buttons = [
					{
						...(addButton || {}),
						fn: () => () => {
							const nextActive = this.props.formData.length;
							this.props.onChange([...this.props.formData, getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)]);
							this.setState({activeIdx: nextActive}, () => focusById(this.props.formContext.contextId ,`${this.props.idSchema.$id}_${this.state.activeIdx}`));
						}, 
						key: "_add",
						glyph: "plus"
					},
					...options.buttons.filter(button => button !== addButton),
				];
				const updateTail = {[injectionTarget.buttons ? "$push" : "$set"]: buttons};
				const updateObject = getUpdateObjectFromJSONPath(`${_buttonsPath}/ui:options`, {buttons: updateTail});
				belowUiSchema = update(belowUiSchema, updateObject);
			}
		}

		if (removeAddButtonPath && this.state.activeIdx !== undefined) {
			const target = parseJSONPointer(inlineUiSchema, `${removeAddButtonPath}/ui:options`, "createParents");
			target.renderAdd = false;
		} else {
			inlineUiSchema["ui:options"].buttons = uiSchema["ui:options"].buttons || [];
		}

		const inlineSchema = <SchemaField key={`${this.props.idSchema.$id}_${activeIdx}_inline`}{...defaultProps} {...inlineSchemaProps} uiSchema={inlineUiSchema} {...overrideProps} />;
		const belowSchema = belowFields ? <SchemaField key={`${this.props.idSchema.$id}_${activeIdx}_below`} {...defaultProps} {...belowSchemaProps} uiSchema={belowUiSchema} /> : null;

		const buttons =  mapOptions.emptyMode ? 
			this.props.uiSchema["ui:options"].buttons.map(button => getButton(button, {canAdd: button.key === "addNamedPlace", uiSchema: this.props.uiSchema})).filter(button => button) :
			undefined;

		const errors = (errorSchema && errorSchema[activeIdx] && errorSchema[activeIdx][geometryField]) ?
			errorSchema[activeIdx][geometryField].__errors : null;

		const mapPropsToPass = {
			contextId: this.props.formContext.contextId,
			lang: this.props.formContext.lang,
			onPopupClose: this.onPopupClose,
			markerPopupOffset: 45,
			featurePopupOffset: 5,
			popupOnHover: true,
			onFocusGrab: this.onFocusGrab,
			onFocusRelease: this.onFocusRelease,
			panel: errors ? {
				header: this.props.formContext.translations.Error,
				panelTextContent: <div id={`laji-form-error-container-${this.props.idSchema.$id}_${activeIdx}_${geometryField}`}>{errors}</div>,
				bsStyle: "danger"
			} : null,
			draw: false,
			zoomToData: true,
			onOptionsChanged: this.onOptionsChanged,
			...mapOptions,
			controls: {
				...(mapOptions.controlSettings || {}),
				...(mapOptions.controls || {})
			}
		};
		const map = (
			<MapComponent
				ref="map"
				{...mapPropsToPass}
			/>
		);

		const wrapperProps = {
			getContainer: this.getContainer,
			topOffset: topOffset === undefined ? this.props.formContext.topOffset : topOffset,
			bottomOffset: bottomOffset === undefined ? this.props.formContext.bottomOffset : bottomOffset,
			onResize: this.onResize,
			mounted: this.state.mounted,
			className: this.state.focusGrabbed ? "pass-block" : "",
			minHeight: getUiOptions(this.props.uiSchema).minHeight
		};

		const wrappedMap = belowSchema ? (
			<Stretch {...wrapperProps}  ref="stretch">
				{map}
			</Stretch>
		) : (
			<StretchAffix {...wrapperProps} getAligmentAnchor={this.getAligmentAnchor}>
				{map}
			</StretchAffix>
		);

		return (
			<div ref="affix">
				<Row>
					<Col {...mapSizes} className="form-group-padding-bottom">
						{wrappedMap}
					</Col>
					<Col {...schemaSizes} ref="_stretch">
						{mapOptions.emptyMode ?
								<Popover placement="right" id={`${this.props.idSchema.$id}-help`}>{
									<div>
										{this.props.uiSchema["ui:help"]}
										{buttons && buttons.length ? ` ${this.props.formContext.translations.or}` : null}
										{buttons}
									</div>
								}</Popover> :
							inlineSchema
						}
					</Col>
				</Row>
				{popupFields ?
					<div style={{display: "none"}}>
						<Popup data={this.getFeaturePopupData(this.state.popupIdx)} ref="popup"/>
					</div> : null}
				<Row>
					{mapOptions.emptyMode ? null : belowSchema}
				</Row>
			</div>
		);
	}

	getDraftStyle = () => {
		return {color: "#25B4CA", opacity: 1};
	}
	
	getUnitFeatureStyle = () => {
		const color = "#55AEFA";
		return {color: color, fillColor: color, weight: 4};
	}

	mapKeyFunctions = {
		splitLineTransectByMeters: () => {
			this.map.splitLTByMeters(this.state.activeIdx);
		}
	};

	getPopup = (idx, feature, openPopupCallback) => {
		if (!this.refs.popup) return;
		this.setState({popupIdx: idx}, () => {
			this.refs.popup && hasData(this.getFeaturePopupData(idx)) && openPopupCallback(this.refs.popup.refs.popup);
		});
	}

	getFeaturePopupData = (idx) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);
		const geometryMapperField = this.field;
		const {formData} = this.props;

		if (!geometryMapperField) return false;

		let data = {};
		if (!formData || this.state.activeIdx === undefined || !formData[this.state.activeIdx] ||
		    !formData[this.state.activeIdx][geometryMapperField] || idx === undefined) return data;

		popupFields.forEach(field => {
			const fieldName = field.field;
			const itemFormData = formData[this.state.activeIdx][geometryMapperField][idx];
			let fieldSchema = this.props.schema.items.properties[geometryMapperField].items.properties;
			let fieldData = itemFormData ? itemFormData[fieldName] : undefined;
			if (field.mapper) {
				try {
					const mappedData = popupMappers[field.mapper](fieldSchema, itemFormData, field);

					for (let label in mappedData) {
						const item = mappedData[label];
						if (hasData(item)) data[label] = item;
					}
				} catch (e) {
					console.warn(`Warning: Popup mapper ${field.mapper} crashed!`);
				}
			} else if (fieldData) {
				const title = fieldSchema[fieldName].title || fieldName;
				data[title] = fieldData;
			}
		});
		return data;
	}
});
}

class Popup extends Component {
	render() {
		const { data } = this.props;
		return (data && Object.keys(data).length) ? (
			<ul ref="popup" className="map-data-tooltip">
				{data ? Object.keys(data).map(fieldName => {
					const item = data[fieldName];
					return <li key={fieldName}><strong>{fieldName}:</strong> {Array.isArray(item) ? item.join(", ") : item}</li>;
				}) : null}
			</ul>
		) : null;
	}
}

class MapComponent extends Component {
	constructor(props) {
		super(props);
		this.state = {mapOptions: {}};
		this.mainContext = new Context(props.contextId);
		this._context = new Context(`${props.contextId}_MAP`);
		this._context.grabFocus = this.grabFocus;
		this._context.releaseFocus = this.releaseFocus;
		this._context.showPanel = this.showPanel;
		this._context.hidePanel = this.hidePanel;
		this._context.setMapState = this.setMapState;
		this._context.setOnUpdateMap = this.setOnUpdateMap;
	}

	componentDidMount() {
		this.map = this.refs.map.map;
		this._context.map = this.map;

		this.map.setEventListeners({
			tileLayerChange: ({tileLayerName}) => {
				this.setState({mapOptions: {...this.state.mapOptions, tileLayerName}});
			},
			overlaysChange: ({overlayNames}) => {
				this.setState({mapOptions: {...this.state.mapOptions, overlayNames}});
			},
			tileLayerOpacityChangeEnd: ({tileLayerOpacity}) => {
				this.setState({mapOptions: {...this.state.mapOptions, tileLayerOpacity}});
			}
		});
	}

	componentDidUpdate(prevProps, prevState) {
		if (this._callback) this._callback();
		this._callback = undefined;

		if  (this.props.onOptionsChanged && ["tileLayerName", "tileLayerOpacity", "overlayNames"].some(name => 
			!deepEquals(...[this.state, prevState].map(state => state.mapOptions[name]))
		)) {
			this.props.onOptionsChanged(this.state.mapOptions);
		}

		if (this._permaCallback) this._permaCallback();
	}

	grabFocus = () => {
		this.mainContext.pushBlockingLoader();
		this.setState({focusGrabbed: true}, () => {
			if (this.props.onFocusGrab) this.props.onFocusGrab();
		});
	}

	releaseFocus = () => {
		this.mainContext.popBlockingLoader();
		this.setState({focusGrabbed: false}, () => {
			if (this.props.onFocusRelease) this.props.onFocusRelease();
		});
	}

	showPanel = (options) => {
		this.setState({panel: true, ...options});
	}

	hidePanel = () => {
		this.setState({panel: false});
	}

	setMapState = (options, callback) => {
		this._callback = callback;
		this.setState({mapOptions: options});
	}

	setOnUpdateMap = (fn) => {
		this._permaCallback = fn;
	}

	render() {
		const {panel, contextId, ...mapOptions} = this.props; // eslint-disable-line

		const controlledPanel = panel ?
			<MapPanel bsStyle={panel.bsStyle || undefined}
			          buttonBsStyle={panel.buttonBsStyle}
			          header={panel.header}
			          text={panel.panelTextContent} />
			: null;

		return (
			<div className={"laji-form-map-container" + (this.state.focusGrabbed ? " pass-block" : "")}>
				{controlledPanel}
				{this.state.panel ?
					<MapPanel show={this.state.panel}
					          text={this.state.panelTextContent}
					          onClick={this.state.panelButtonOnClick}
					          buttonText={this.state.panelButtonContent}
					          buttonBsStyle={this.state.panelButtonBsStyle}
					/> : null
				}
				<Map className={this.props.className}
				     style={this.props.style} 
				     ref="map" 
				     {...{...mapOptions, ...this.state.mapOptions}}
				/>
			</div>
		);
	}
}

let singletonMap = undefined;

export class Map extends Component {
	componentDidMount() {
		let {className, style, onComponentDidMount, ...options} = this.props; // eslint-disable-line no-unused-vars

		// Backward compability for bad settings.
		["tileLayerName", "overlayNames", "tileLayerOpacity"].forEach(prop => {
			if (prop in options && options[prop] === undefined) {
				options = immutableDelete(options, prop);
			}
		});

		if (!this.props.hidden) {
			this.initializeMap(options);
			this.mountCalled = true;
			if (this.props.onComponentDidMount) this.props.onComponentDidMount(this.map);
		}
	}

	componentDidUpdate(prevProps) {

		const {className, style, onComponentDidMount, hidden, singleton, ...options} = this.props; // eslint-disable-line no-unused-vars

		if (this.map && options.lineTransect && "activeIdx" in options.lineTransect) {
			this.map.setLTActiveIdx(options.lineTransect.activeIdx);
		}
		delete options.lineTransect;

		this.setOptions(prevProps, options);

		if (!hidden && !this.map) {
			this.initializeMap(options);
			if (onComponentDidMount) onComponentDidMount(this.map);
		}
	}

	setOptions = (prevOptions, options) => {
		const {className, style, onComponentDidMount, hidden, singleton, ..._options} = options; // eslint-disable-line no-unused-vars
		const {
			className: prevClassName, // eslint-disable-line no-unused-vars
			style: prevStyle,  // eslint-disable-line no-unused-vars
			onComponentDidMount: prevOnComponentDidMount,  // eslint-disable-line no-unused-vars
			hidden: prevHidden,  // eslint-disable-line no-unused-vars
			singleton: prevSingleton,  // eslint-disable-line no-unused-vars
			..._prevOptions
		} = prevOptions;
	

		if (this.map) Object.keys(_options).forEach(key => {
			if (!deepEquals(_options[key], _prevOptions[key])) {
				this.map.setOption(key, _options[key]);
			}
		});
	}

	initializeMap = (options) => {
		if (this.props.singleton) {
			if (!singletonMap) {
				singletonMap = new LajiMap({
					rootElem: this.refs.map,
					...options
				});
				this.map = singletonMap;
			} else {
				this.map = singletonMap;
				this.setOptions(singletonMap.getOptions(), {...options, rootElem: this.refs.map});
			}
		} else {
			this.map = new LajiMap({
				rootElem: this.refs.map,
				...options
			});
		}
	}

	render() {
		return (
			<div key="map"
				 className={"laji-form-map" + (this.props.className ? " " + this.props.className : "")}
				 style={this.props.style} ref="map" />
		);
	}
}

class MapPanel extends Component {
	render() {
		return (
				<Panel bsStyle={this.props.bsStyle || undefined} header={this.props.header} className="laji-form-popped">
					{this.props.text}
					{this.props.buttonText ?
						<Button bsStyle={this.props.buttonBsStyle || "default"} onClick={this.props.onClick}>{this.props.buttonText}</Button> :
						null
					}
				</Panel>
		);
	}
}
