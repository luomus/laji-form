import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import update from "immutability-helper";
import deepEquals from "deep-equal";
import merge from "deepmerge";
import LajiMap from "laji-map";
import { Row, Col, Panel, Popover, ButtonToolbar } from "react-bootstrap";
import PanelHeading from "react-bootstrap/lib/PanelHeading";
import PanelBody from "react-bootstrap/lib/PanelBody";
import { Button, Stretch } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, immutableDelete, getSchemaElementById, getBootstrapCols, isNullOrUndefined, parseJSONPointer, injectButtons, focusAndScroll, formatErrorMessage } from "../../utils";
import { getDefaultFormState, toIdSchema } from "react-jsonschema-form/lib/utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import { getPropsForFields } from "./NestField";
import { getButton } from "../ArrayFieldTemplate";
import ApiClient from "../../ApiClient";

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

		const data = geometries && geometries.length || !options.placeholderGeometry
			? undefined
			: {
				geoData: options.placeholderGeometry,
				getFeatureStyle: this._getPlaceholderStyle
			};

		return {draw, controls, emptyMode, data};
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
				this.setState({activeIdx: 0});
			}
		});
	}

	getData() {
		const {formData} = this.props;
		const {activeIdx} = this.state;
		const {geometryField} = getUiOptions(this.props.uiSchema);
		if (!formData) return;

		const item = formData[activeIdx];
		this._context.featureIdxsToItemIdxs = {};

		let geometries = [];
		if (activeIdx !== undefined && item && item[geometryField] && item[geometryField].type) {
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
			case "insert":
				this.onInsert(e);
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
		const geometry = this.props.formData[this.state.activeIdx][geometryField];
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {[geometryField]: geometry.type === "GeometryCollection" ? {
				geometries: Object.keys(features).reduce((obj, idx) => {
					obj[idx] = {$set: features[idx].geometry};
					return obj;
				}, {})
			} : {$set: features[0].geometry}}}));
	}

	onInsert({idx, feature}) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {[geometryField]: {
				geometries: {$splice: [[idx, 0, feature.geometry]]}
			}}}));
	}

	afterActiveChange(idx) {
		if (idx === undefined) return;
		this.map.zoomToData();
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
		this.onInsert = DefaultMapArrayField.prototype.onInsert.bind(this);
		this.afterActiveChange = DefaultMapArrayField.prototype.afterActiveChange.bind(this);
	}

	componentDidMount() {
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "startHighlightUnit", this.startHighlightUnit);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "endHighlightUnit", this.endHighlightUnit);
	}

	componentWillUnmount() {
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "startHighlightUnit");
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "endHighlightUnit");
	}

	startHighlightUnit = (idx) => {
		const layers = this.map.data[0].group._layers;
		for (let id of Object.keys(this.map.data[0].group._layers)) {
			const layer = layers[id];
			if (layer.feature.properties.idx === idx) {
				this.map.setLayerStyle(layer, {color: "#75CEFA"});
				break;
			}
		}
	};

	endHighlightUnit = (idx) => {
		const layers = this.map.data[0].group._layers;
		for (let id of Object.keys(this.map.data[0].group._layers)) {
			const layer = layers[id];
			if (layer.feature.properties.idx === idx) {
				this.map.setLayerStyle(layer, {color: this.getUnitFeatureStyle().color});
				break;
			}
		}
	};

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
			on: {
				mouseover: this.onMouseOver,
				mouseout: this.onMouseOut
			}
		};

		this.unitFeatures = data.featureCollection.features;

		const controls = (emptyMode || !isNullOrUndefined(this.state.activeIdx)) ?
			{} : {draw: false};

		return {draw, data, controls, emptyMode};
	}

	onMouseOver = (e, {feature}) => {
		const {idx} = feature.properties || {};

		if (idx === undefined) {
			return;
		}

		const id = `${this.props.idSchema.$id}_${this.state.activeIdx}_units_${idx}`;
		this.highlightedElem = getSchemaElementById(this.props.formContext.contextId, id);

		if (this.highlightedElem) {
			this.highlightedElem.className += " map-highlight";
		}
	}

	onMouseOut = () => {
		if (this.highlightedElem) {
			this.highlightedElem.className = this.highlightedElem.className.replace(" map-highlight", "");
		}
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
}

@_MapArrayField
class LineTransectMapArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {showLTTools: false};
	}
	
	getOptions() {
		const {formData} = this.props;
		const {geometryField, placeholderGeometry} = getUiOptions(this.props.uiSchema);
		const lineTransect = this.hasLineTransectFeature(this.props)
			? {type: "MultiLineString", coordinates: formData.map(item => item[geometryField].coordinates)}
			: undefined;
		return {
			lineTransect: lineTransect ? {
				feature: {geometry: lineTransect},
				activeIdx: this.state.activeIdx,
				onChange: this.onChange,
				getFeatureStyle: this.getFeatureStyle,
				getTooltip: this.getTooltip
			} : undefined,
			draw: lineTransect ? false : {
				line: true,
				marker: false,
				circle: false,
				rectangle: false,
				polygon: false,
				onChange: this.onLineCreate
			},
			data: lineTransect || !placeholderGeometry ? false : {
				geoData: placeholderGeometry,
				getFeatureStyle: this._getPlaceholderStyle
			},
			controls: {
				lineTransect: {
					split: true,
					splitByMeters: this.state.showLTTools,
					createPoint: this.state.showLTTools,
					shiftPoint: this.state.showLTTools,
					deletePoints: this.state.showLTTools,
					undo: this.state.showLTTools,
					redo: this.state.showLTTools
				},
				draw: {
					undo: false,
					redo: false
				}
			},
			customControls: [{
				iconCls: `glyphicon glyphicon-${this.state.showLTTools ?  "menu-up" : "option-vertical"}`,
				fn: () => {
					this.setState({showLTTools: !this.state.showLTTools});
				},
				text: this.props.formContext.translations[this.state.showLTTools ? "HideLineTransectControls" : "ShowLineTransectControls"],
				group: "lineTransect"
			}]
			
		};
	}

	onLineCreate = ([event]) => {
		this.props.onChange(update(this.props.formData, {0: {geometry: {$set: 
			event.feature.geometry
		}}}));
	}

	onChange = (events) => {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		let state = {};
		let {formData} = this.props;
		let formDataChanged = false;
		events.forEach(e => {
			switch (e.type) {
			case "insert": {
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
			case "merge": {
				formDataChanged = true;
				const [first, second] = e.idxs;
				formData = update(formData, {[first]: {units: {$set: [
					...formData[first].units,
					...formData[second].units
				]}}});
				formData = update(formData, {
					[first]: {
						[geometryField]: {$set: e.geometry}
					}
				});
				formData = update(formData, {$splice: [[second, 1]]});
				break;
			}
			case "move": {
				formDataChanged = true;
				const {idx, target} = e;

				let splices = [
						[idx, 1],
						[target, 0, formData[idx]],
				];
				 // Splices must be executed in reverse order to keep idxs correct.
				if (target > idx) splices = splices.reverse();
				formData = update(formData, {$splice: splices});
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
			if ("activeIdx" in state) {
				this.afterActiveChange(state.activeIdx);
			}
		};
		Object.keys(state).length ?	this.setState(state, afterState()) : afterState();
	}

	getFeatureStyle = ({lineIdx, style, type}) => {
		if (this.props.errorSchema[lineIdx]) {
			return (type === L.CircleMarker) // eslint-disable-line no-undef
				? style
				: {...style, fillColor: "#f33"};
		}
		const {gatheringFact = {}} = this.props.formData[lineIdx] || {};
		const {lineTransectSegmentCounted} = gatheringFact;
		if (!lineTransectSegmentCounted) {
			return { ...style, fillColor: "#444444"};
		}
	}

	getTooltip = (lineIdx, content) => {
		const {translations} = this.props.formContext;
		if (this.props.errorSchema[lineIdx]) {
			content = `${content}<br/><span class=\"text-danger\">${translations.LineTransectSegmentHasErrors}!</span>`;
		}
		const {gatheringFact = {}} = this.props.formData[lineIdx];
		const {lineTransectSegmentCounted} = gatheringFact;
		if (!lineTransectSegmentCounted) content = `${content}<br/>${translations.LineTransectSegmentNotCounted}`;
		return content;
	}

	afterActiveChange(idx) {
		this.focusOnMap(idx);
	}

	hasLineTransectFeature(props) {
		const {geometryField} = getUiOptions(props.uiSchema);
		return Object.keys(props.formData[0][geometryField]).length;
	}

	focusOnMap = (idx) => {
		if (!this.hasLineTransectFeature(this.props)) {
			setImmediate(() => this.map.zoomToData({paddingInMeters: 200}));
			return;
		}
		this.getContext().setImmediate(() =>{
			this.map.fitBounds(L.featureGroup(this.map._lineLayers[idx]).getBounds(), {maxZoom: 13}); // eslint-disable-line no-undef
		});
	}

	componentDidUpdate(prevProps) {
		if (!this.hasLineTransectFeature(prevProps) || !this.hasLineTransectFeature(this.props)) return;
		for (let lineIdx = 0; lineIdx < this.props.formData.length; lineIdx++) {
			this.map._updateLTStyleForLineIdx(lineIdx);
		}
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
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	constructor(props) {
		super(props);
		this._context = new Context(`${props.formContext.contextId}_MAP_CONTAINER`);
		this._context.featureIdxsToItemIdxs = {};
		this._context.setState = (state, callback) => this.setState(state, callback);

		const initialState = {activeIdx: 0};
		const options = getUiOptions(props.uiSchema);
		if ("activeIdx" in options) initialState.activeIdx = options.activeIdx;
		this.state = {...initialState, ...(this.state || {})};
	}

	componentDidMount() {
		if (super.componentDidMount) super.componentDidMount();
		this.setState({mounted: true});
		this.getContext().addKeyHandler(`${this.props.idSchema.$id}`, this.mapKeyFunctions);
		this.map = this.refs.map.refs.map.map;
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "activeIdx", idx => {
			this.setState({activeIdx: idx});
		});
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "zoomToData", () => {
			this._zoomToDataOnNextTick = true;
		});
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "tileLayerName", (tileLayerName, callback) => {
			this._tileLayerNameOnNextTick = tileLayerName;
			this._tileLayerNameOnNextTickCallback = callback;
		});

		if (this.state.activeIdx !== undefined) {
			this.afterActiveChange(this.state.activeIdx, !!"initial call");
		}
	}

	afterActiveChange(idx) {
		super.afterActiveChange(idx);
		this.onLocateOrAddNew();
	}

	componentWillUnmount() {
		this.setState({mounted: false});
		this.getContext().removeKeyHandler(`${this.props.idSchema.$id}`, this.mapKeyFunctions);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "activeIdx");
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "zoomToData");
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "tileLayerName");
	}

	componentDidUpdate(...params) {
		if (super.componentDidUpdate) super.componentDidUpdate(...params);

		const [prevProps, prevState] = params; // eslint-disable-line no-unused-vars

		if (prevState.activeIdx !== this.state.activeIdx) {
			if (!this.nestedHandledActiveChange && this.state.activeIdx !== undefined) {
				const {idToFocusAfterNavigate, idToScrollAfterNavigate} = getUiOptions(this.props.uiSchema);
				focusAndScroll(this.props.formContext, idToFocusAfterNavigate || `${this.props.idSchema.$id}_${this.state.activeIdx}`, idToScrollAfterNavigate);
			}
			this.nestedHandledActiveChange = false;
			this.afterActiveChange(this.state.activeIdx);
		}

		if (this.refs.stretch) {
			const {resizeTimeout} = getUiOptions(this.props.uiSchema);
			if (resizeTimeout) {
				this.getContext().setTimeout(this.refs.stretch.update, resizeTimeout);
			} else {
				this.refs.stretch.update();
			}
		}
		if (this._zoomToDataOnNextTick) {
			this._zoomToDataOnNextTick = false;
			this.map.zoomToData();
		}
		if (this._tileLayerNameOnNextTick) {
			const tileLayerName = this._tileLayerNameOnNextTick;
			this._tileLayerNameOnNextTick = false;
			this.map.setTileLayerByName(tileLayerName);
		}
		if (this.state.fullscreen && !prevState.fullscreen) {
			this._mapContainer = this.map.rootElem;
			this.map.setRootElem(findDOMNode(this.fullscreenRef));
			this.map.setOption("clickBeforeZoomAndPan", false);
		} else if (!this.state.fullscreen && prevState.fullscreen) {
			this.map.setRootElem(this._mapContainer);
			this.map.setOption("clickBeforeZoomAndPan", true);
		}

		// Zoom map to area. Area ID is accessed from schema field defined in options.areaField
		const item = (this.props.formData || [])[this.state.activeIdx];
		const {areaField} = getUiOptions(this.props.uiSchema);
		if (!item || !areaField) {
			return;
		}
		let area = item[areaField];
		if (area instanceof Array) {
			area = area[0];
		}
		const geometries = this.getData();
		if(geometries.length === 0 && area && area.length > 0) {
			new ApiClient().fetch(`/areas/${area}`, undefined, undefined).then((result)=>{
				this.map.geocode(result.name, undefined, 8);
			});
		}
	}


	_getPlaceholderStyle() {
		return {
			color: "#999999",
			fillOpacity: 0,
			weight: 8
		};
	}

	getContainer = () => {
		return findDOMNode(this.refs._stretch);
	}
	onResize = () => this.refs.map.map.map.invalidateSize({debounceMoveend: true})
	onPopupClose = () => this.setState({popupIdx: undefined})
	onFocusGrab = () => this.setState({focusGrabbed: true})
	onFocusRelease = () => this.setState({focusGrabbed: false})
	onOptionsChanged = (options) => this.setState({mapOptions: {...this.state.mapOptions, ...options}}, () => {
		if (this._tileLayerNameOnNextTickCallback) {
			this._tileLayerNameOnNextTickCallback();
			this._tileLayerNameOnNextTickCallback = undefined;
		}
	})
	getAlignmentAnchor = () => this.refs._stretch
	onEnterViewPort = () => {
		this.afterActiveChange(this.state.activeIdx, !!"initial call");
	}

	getMapOptions = () => {
		const options = getUiOptions(this.props.uiSchema);
		let _options = merge.all([
			{clickBeforeZoomAndPan: true},
			(options.mapOptions || {}),
			(this.getOptions(options) || {}),
			(this.state.mapOptions || {})
		]);
		if (options.createOnLocate && !_options.locate) {
			_options = {
				..._options,
				locate: [this.onLocate]
			};
		}
		return _options;
	}

	onActiveChange = (idx, callback) => {
		this.nestedHandledActiveChange = true;
		this.setState({activeIdx: idx}, () => {
			if (!callback) return;
			callback();
		});
	}
	
	customAdd = () => () => {
		const nextActive = this.props.formData.length;
		this.props.onChange([...this.props.formData, getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)]);
		this.setState({activeIdx: nextActive});
	}

	render() {
		const {registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema, errorSchema, schema} = this.props;
		const options = getUiOptions(this.props.uiSchema);
		const {popupFields, geometryField, topOffset, bottomOffset, belowFields, propsToPassToInlineSchema = [], emptyHelp} = options;
		let {belowUiSchemaRoot = {}, inlineUiSchemaRoot = {}, idToFocusAfterNavigate, idToScrollAfterNavigate} = options;
		const {activeIdx} = this.state;

		const activeIdxProps = {
			activeIdx,
			onActiveChange: this.onActiveChange,
			idToFocusAfterNavigate,
			idToScrollAfterNavigate
		};
		uiSchema = getInnerUiSchema(uiSchema);
		if (getUiOptions(this.props.uiSchema).buttons) {
			uiSchema = {
				...uiSchema,
				"ui:options": {
					...uiSchema["ui:options"],
					buttons: [...uiSchema["ui:options"], ...getUiOptions(this.props.uiSchema).buttons]
				}
			};
		}

		let mapOptions = this.getMapOptions();

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
					`${this.props.idSchema.$id}_${activeIdx}`,
					this.props.registry.definitions
				),
				formData: (this.props.formData || [])[activeIdx],
				errorSchema: this.props.errorSchema[activeIdx] || {},
				registry: this.props.registry,
				formContext: this.props.formContext
			};
		};

		const putChildsToParents = (props) => {
			return {
				schema: {...schema, items: props.schema},
				uiSchema: {...uiSchema, items: props.uiSchema},
				idSchema: this.props.idSchema,
				formData: update((this.props.formData || []), {$merge: {[activeIdx]: props.formData}}),
				errorSchema: props.errorSchema && Object.keys(props.errorSchema).length ? 
					{[activeIdx]: props.errorSchema} : 
					{},
				onChange: formData => {
					this.props.onChange(formData.map((item, idx) => {
						return {
							...(this.props.formData[idx] || getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)), 
							...item
						};
					}));
				},
				registry: this.props.registry,
				formContext: this.props.formContext
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

		let belowUiSchema =  belowSchemaProps ? {...belowSchemaProps.uiSchema, ...belowUiSchemaRoot} : {};

		inlineUiSchema = {...inlineUiSchema, "ui:options": {...(inlineUiSchema["ui:options"] || {}), ...activeIdxProps}};
		belowUiSchema = {...belowUiSchema, "ui:options": {...(belowUiSchema["ui:options"] || {}), ...activeIdxProps}};

		if (!belowUiSchema.items) {
			belowUiSchema.items = {};
		}
		if (!belowUiSchema.items["ui:options"]) {
			belowUiSchema.items["ui:options"] = {};
		}
		belowUiSchema.items["ui:options"].reserveId = false;

		const {buttonsPath, addButtonPath} = getUiOptions(this.props.uiSchema);
		if (addButtonPath) console.warn("addButtonPath option for MapArrayField is deprecated - use buttonsPath instead!");
		let _buttonsPath = buttonsPath || addButtonPath;

		const appendAddButton = (buttons) => {
			const addButton = buttons.find(({fn}) => fn === "add");
			return [
				{
					...(addButton || {}),
					fn: this.customAdd,
					fnName: "add",
					glyph: "plus",
					id: this.props.idSchema.$id
				},
				...buttons.filter(button => button !== addButton),
			];
		};

		let buttons = undefined;
		let renderButtonsBelow = false;
		if (activeIdx !== undefined && options.buttons) {
			if (_buttonsPath) {
				buttons = appendAddButton(options.buttons);
				belowUiSchema = injectButtons(belowUiSchema, buttons, _buttonsPath);
				inlineUiSchema["ui:options"].renderAdd = false;
			} else if (options.renderButtonsBelow) {
				buttons = appendAddButton(options.buttons);
				inlineUiSchema["ui:options"].renderAdd = false;
				renderButtonsBelow = true;
			}
		} else if (activeIdx === undefined || (!_buttonsPath && !renderButtonsBelow)) {
			inlineUiSchema["ui:options"].buttons = uiSchema["ui:options"].buttons || [];
		}

		const inlineSchema = <SchemaField {...inlineSchemaProps} uiSchema={inlineUiSchema} {...overrideProps} />;
		const belowSchema = belowFields ? <SchemaField {...defaultProps} {...belowSchemaProps} uiSchema={belowUiSchema} /> : null;

		buttons =  buttons && (!_buttonsPath || mapOptions.emptyMode)
			? buttons.map(button => getButton(button, {
				canAdd: mapOptions.emptyMode ? button.fnName === "addNamedPlace" : true,
				uiSchema: this.props.uiSchema,
				idSchema: this.props.idSchema,
				formData: this.props.formData,
				formContext: this.props.formContext
			})).filter(button => button)
			: undefined;

		const errors = (errorSchema && errorSchema[activeIdx] && errorSchema[activeIdx][geometryField])
			? errorSchema[activeIdx][geometryField].__errors.map(formatErrorMessage)
			: null;

		const mapPropsToPass = {
			contextId: this.props.formContext.contextId,
			googleApiKey: this.props.formContext.googleApiKey,
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
				...(mapOptions.controls || {})
			},
			customControls: [
				...(mapOptions.customControls || []),
				{
					iconCls: `glyphicon glyphicon-resize-${this.state.fullscreen ? "small" : "full"}`,
					fn: this.toggleFullscreen,
					position: "bottomright",
					text: this.props.formContext.translations[this.state.fullscreen ? "MapExitFullscreen" : "MapFullscreen"]
				}
			]
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

		const wrappedMap = (
			<Stretch {...wrapperProps}  ref="stretch">
				{map}
			</Stretch>
		);
		const {TitleField} = this.props.registry.fields;

		return (
			<div>
				<Row>
					<Col {...mapSizes}>
						{wrappedMap}
					</Col>
					<Col {...schemaSizes} ref="_stretch">
						{mapOptions.emptyMode ?
							(!emptyHelp && (!buttons || !buttons.length) ? null :
								<Popover placement="right" id={`${this.props.idSchema.$id}-help`}>{
									<div>
										{emptyHelp}
										{buttons && buttons.length ? ` ${this.props.formContext.translations.or}` : null}
										{buttons}
									</div>
								}</Popover>
							) :
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
				{renderButtonsBelow && !mapOptions.emptyMode && buttons.length ? (
				<Row className="map-array-field-below-buttons">
					<TitleField title={getUiOptions(uiSchema).buttonsTitle} />
					<ButtonToolbar>{buttons}</ButtonToolbar>
				</Row>
				) : null}
				{
					this.state.fullscreen ? (
						<div className="map-fullscreen" ref={this.setFullscreenRef} />
					) : null
				}
			</div>
		);
	}

	setFullscreenRef = (elem) => {
		this.fullscreenRef = elem;
	}

	toggleFullscreen = () => {
		this.setState({fullscreen: !this.state.fullscreen});
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

	onLocate = (latlng, radius) => {
		this.location = latlng ? {latlng, radius} : undefined;
		this.onLocateOrAddNew();
	}

	onLocateOrAddNew = () => {
		if (!this.location) return;

		const {latlng, radius} = this.location;
		const {createOnLocate, geometryField} = getUiOptions(this.props.uiSchema);
		if (!createOnLocate) return;

		const {formData} = this.props;
		if (this.props.formData.length === 0 
			|| (
				!formData[this.state.activeIdx][geometryField] ||
				!formData[this.state.activeIdx][geometryField] ||
				!Object.keys(formData[this.state.activeIdx][geometryField]).length
			)) {
			let geometry = undefined;
			if (createOnLocate === "marker") {
				geometry = {type: "Point", coordinates: [latlng.lng, latlng.lat]};
			}
			if (createOnLocate === "circle") {
				geometry = {type: "Point", coordinates: [latlng.lng, latlng.lat], radius};
			}
			this.map.addFeatureToDraw({
				type: "Feature",
				properties: {},
				geometry
			});
		}
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

export class MapComponent extends Component {
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
			},
			locateToggle: ({locate}) => {
				this.setState({mapOptions: {...this.state.mapOptions, locate}});
			}
		});
	}

	componentDidUpdate(prevProps, prevState) {
		if (this._callback) this._callback();
		this._callback = undefined;

		if  (this.props.onOptionsChanged && ["tileLayerName", "tileLayerOpacity", "overlayNames", "locate"].some(name => 
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

export class Map extends Component {
	static defaultProps = {
		availableTileLayerNamesBlacklist: ["pohjakartta"]
	};

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
			if (this.props.onComponentDidMount) this.props.onComponentDidMount(this.map);
			if (this.map) {
				setImmediate(() => {
					this.map.map.invalidateSize();
					if (this.props.singleton) {
						if (options.zoomToData) {
							this.map.zoomToData();
						}
					}
				});
			}
		}
	}

	componentWillUnmount() {
		if (!this.props.singleton) this.map.destroy();
	}

	componentDidUpdate(prevProps) {
		const {className, style, onComponentDidMount, hidden, singleton, ...options} = this.props; // eslint-disable-line no-unused-vars

		if (this.map && prevProps.lineTransect && options.lineTransect && "activeIdx" in options.lineTransect) {
			this.map.setLTActiveIdx(options.lineTransect.activeIdx);
		}
		if (prevProps.lineTransect) delete options.lineTransect;

		this.setOptions(prevProps, options);

		if (!hidden && !this.map) {
			this.initializeMap(options);
			if (onComponentDidMount) onComponentDidMount(this.map);
		}
	}

	setOptions = (prevOptions, options) => {
		const {className, style, hidden, singleton, emptyMode, contextId, ..._options} = options; // eslint-disable-line no-unused-vars
		const {
			className: prevClassName, // eslint-disable-line no-unused-vars
			style: prevStyle,  // eslint-disable-line no-unused-vars
			onComponentDidMount: prevOnComponentDidMount, // eslint-disable-line no-unused-vars
			hidden: prevHidden,  // eslint-disable-line no-unused-vars
			singleton: prevSingleton,  // eslint-disable-line no-unused-vars
			emptyMode: prevEmptyMode,  // eslint-disable-line no-unused-vars
			contextId: prevContextId,  // eslint-disable-line no-unused-vars
			..._prevOptions
		} = prevOptions;
	
		if (this.map) {
			Object.keys(_options).forEach(key => {
				switch(key) {
				case "draw": // More optimal way of updating draw data than setting the draw option
					if (!deepEquals(_options.draw, _prevOptions.draw)) {
						this.map.updateDrawData(_options.draw);
					}
					break;
				case "rootElem": // deeqEquals on DOM node causes maximum call stack size exceeding.
					if (_options[key] !== _prevOptions[key]) {
						this.map.setOption(key, _options[key]);
					}
					break;
				default:
					if (!deepEquals(_options[key], _prevOptions[key])) {
						this.map.setOption(key, _options[key]);
					}
				}
			});
		}
	}

	initializeMap = (options) => {
		if (this.props.singleton) {
			const context = new Context(this.props.contextId);
			if (!context.singletonMap) {
				context.singletonMap = new LajiMap({
					rootElem: this.refs.map,
					googleApiKey: this.props.formContext.googleApiKey,
					...options
				});
				this.map = context.singletonMap;
			} else {
				this.map = context.singletonMap;
				this.setOptions(context.singletonMap.getOptions(), {...options, rootElem: this.refs.map});
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
				<Panel bsStyle={this.props.bsStyle || undefined} className="laji-form-popped">
					{this.props.header ? (
						<PanelHeading>
							{this.props.header}
						</PanelHeading>
					) : null}
					<PanelBody>
						{this.props.text}
						{this.props.buttonText ?
							<Button bsStyle={this.props.buttonBsStyle || "default"} onClick={this.props.onClick}>{this.props.buttonText}</Button> :
							null
						}
					</PanelBody>
				</Panel>
		);
	}
}
