import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode, createPortal } from "react-dom";
import update from "immutability-helper";
import deepEquals from "deep-equal";
import merge from "deepmerge";
import LajiMap from "laji-map";
import { combineColors } from "laji-map/lib/utils";
import { NORMAL_COLOR }  from "laji-map/lib/globals";
import { Row, Col, Panel, Popover, ButtonToolbar } from "react-bootstrap";
import PanelHeading from "react-bootstrap/lib/PanelHeading";
import PanelBody from "react-bootstrap/lib/PanelBody";
import { Button, Stretch } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, immutableDelete, getSchemaElementById, getBootstrapCols, isNullOrUndefined, parseJSONPointer, injectButtons, focusAndScroll, formatErrorMessage, getUpdateObjectFromJSONPath, isEmptyString, isObject, formatValue, parseSchemaFromFormDataPointer, parseUiSchemaFromFormDataPointer, scrollIntoViewIfNeeded } from "../../utils";
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

export function parseGeometries(geometry) {
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
		case "lolife":
			return <LolifeMapArrayField {...this.props} />;
		case "lolifeNamedPlace":
			return <LolifeNamedPlaceMapArrayField {...this.props} />;
		}
	}
}

@_MapArrayField
class DefaultMapArrayField extends Component {
	constructor(props) {
		super(props);
		this.onMapChangeCreateGathering = this.onMapChangeCreateGathering.bind(this);
		this.onChange = this.onChange.bind(this);
		this.getGeometry = this.getGeometry.bind(this);
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

		const controls = (emptyMode || this.state.activeIdx !== undefined)
			? {drawCopy: true}
			: {draw: false, coordinateInput: false};

		const data = geometries && geometries.length || !options.placeholderGeometry
			? []
			: {
				geoData: options.placeholderGeometry,
				getFeatureStyle: this._getPlaceholderStyle
			};

		const extraData = (options.data || []).map((dataItem) => (
				{geoData: dataItem.geometryField ? this.getGeometry(dataItem.geometryField) : dataItem}
		));

		return {draw, controls, emptyMode, data: [...data, ...extraData]};
	}

	onMapChangeCreateGathering(events) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		if (!geometryField) {
			return;
		}
		events.forEach(e => {
			if (e.type !== "create") {
				return;
			}

			let splittedPath = geometryField.split("/").filter(s => !isEmptyString(s));

			let _cumulatedPointer = "";
			let _schema = this.props.schema.items;
			const formData = splittedPath.reduce((formData, split, i) => {
				_cumulatedPointer += `/${split}`;
				_schema = _schema.properties
					? _schema.properties[split]
					: _schema.items;
				return update(formData, getUpdateObjectFromJSONPath(_cumulatedPointer,
					{$set: i === splittedPath.length - 1
						? {
							type: "GeometryCollection",
							geometries: [e.feature.geometry]
						}
						: getDefaultFormState(_schema, undefined, this.props.registry.definitions)
					}
				));
			}, getDefaultFormState(_schema, undefined, this.props.registry.definitions));

			this.props.onChange([formData]);
			this.setState({activeIdx: 0});
		});
	}

	getGeometry(_geometryField) {
		const {formData, uiSchema} = this.props;
		const {geometryField} = getUiOptions(uiSchema);
		const {activeIdx} = this.state;
		if (!formData) {
			return;
		}
		const item = formData[activeIdx];
		if (activeIdx === undefined || !item) {
			return;
		}
		const geometryItem = parseJSONPointer(formData[activeIdx], _geometryField || geometryField);
		return geometryItem;
	}

	getGeometries() {
		return this.getData();
	}

	getData() {
		const geometryItem = this.getGeometry();
		if (geometryItem && geometryItem.type) {
			return parseGeometries(geometryItem);
		}
		return [];
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
		this.props.onChange(update(formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPath(geometryField, {$set: {type: "GeometryCollection", geometries: [
				...parseGeometries(this.getGeometry()), geometry
			]}})}));
	}

	onRemove({idxs}) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		let splices = [];
		idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		const geometry = this.getGeometry();
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPath(geometryField, geometry && geometry.type === "GeometryCollection" ?
				{geometries: {$splice: splices}} : {$set: undefined}
			)}));
	}

	onEdited({features}) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		const geometry = this.getGeometry();
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPath(geometryField, geometry.type === "GeometryCollection" ? {
				geometries: Object.keys(features).reduce((obj, idx) => {
					obj[idx] = {$set: features[idx].geometry};
					return obj;
				}, {})
			} : {$set: features[0].geometry}
			)}));
	}

	onInsert({idx, feature}) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPath(geometryField, {
				geometries: {$splice: [[idx, 0, feature.geometry]]}
			})}));
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
		this.getGeometry = DefaultMapArrayField.prototype.getGeometry.bind(this);
	}

	componentDidMount() {
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "startHighlight", this.startHighlight);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "endHighlight", this.endHighlight);
	}

	componentWillUnmount() {
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "startHighlight");
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "endHighlight");
	}

	isGeometryCollection = (idx) => {
		return this.props.formData[this.state.activeIdx].units[idx].unitGathering.geometry.type === "GeometryCollection";
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

		// Separate non geometry collections and geometry collections with single geometry to
		// unitGeometries, and put the rest to unitGeometryCollections. This is for optimization.
		let unitGeometryCollections = {}, unitGeometries = {};
		units.forEach((geometry, idx) => {
			const target = (geometry.type !== "GeometryCollection" || geometry.geometries.length === 1)
				? unitGeometries
				: unitGeometryCollections;
			target[idx] = geometry.type === "GeometryCollection" && geometry.geometries.length === 1
				? geometry.geometries[0]
				: geometry;
		});

		this.unitIdxToGeometryIdx = {};
		this.geometryIdxUnitIdx = {};
		this.unitIdxToGeometryCollectionIdx = {};
		this.geometryCollectionIdxUnitIdx = {};
		const reducer = ([uToG, gToU], idx, _idx) => {
			uToG[idx] = _idx;
			gToU[_idx] = idx;
			return [uToG, gToU];
		};
		Object.keys(unitGeometries).reduce(reducer, [this.unitIdxToGeometryIdx, this.geometryIdxUnitIdx]);
		Object.keys(unitGeometryCollections).reduce(reducer, [this.unitIdxToGeometryCollectionIdx, this.geometryCollectionIdxUnitIdx]);

		if (!this.unitChangeHandlers) {
			this.unitChangeHandlers = {onChange: {}, mouseOver: {}, mouseOut: {}};
		}

		const getCommonOptions = unitIdx => {
			// Store so change detection doesn't think it's a new function.
			const unitChangeHandler = this.unitChangeHandlers.onChange[unitIdx] || this.onUnitChange(unitIdx ? +unitIdx : undefined);
			this.unitChangeHandlers.onChange[unitIdx] = unitChangeHandler;
			const mouseOver = this.unitChangeHandlers.mouseOver[unitIdx] || this.onMouseOver(unitIdx ? +unitIdx : undefined);
			this.unitChangeHandlers.mouseOver[unitIdx] = mouseOver;
			const mouseOut = this.unitChangeHandlers.mouseOut[unitIdx] || this.onMouseOut(unitIdx ? +unitIdx : undefined);
			this.unitChangeHandlers.mouseOut[unitIdx] = mouseOut;
			return {
				getPopup: this.getPopup,
				getFeatureStyle: this.getUnitFeatureStyle,
				getDraftStyle: this.getDraftStyle,
				editable: true,
				onChange: unitChangeHandler,
				on: {
					mouseover: mouseOver,
					mouseout: mouseOut
				}
			};
		};

		const data = [
			{
				featureCollection: {
					type: "FeatureCollection",
					features: Object.keys(unitGeometries).reduce((units, idx) => {
						idx = +idx;
						const geometry = unitGeometries[idx];
						if (geometry) units.push({type: "Feature", properties: {idx}, geometry});
						return units;
					}, [])
			  },
			  ...getCommonOptions()
			},
			...Object.keys(unitGeometryCollections).map(idx => {
				idx = +idx;
				const geometryCollection = unitGeometryCollections[idx];
				return {
					featureCollection: {
						type: "FeatureCollection",
						features: geometryCollection.geometries.map(geometry => ({
							type: "Feature", properties: {idx}, geometry
						}))
					},
					...getCommonOptions(this.geometryCollectionIdxUnitIdx[idx])
				};
			})
		];

		this.unitFeatures = data[0].featureCollection.features;

		const controls = (emptyMode || !isNullOrUndefined(this.state.activeIdx)) ?
			{} : {draw: false};

		return {draw, data, controls, emptyMode};
	}

	startHighlight = (idx) => {
		const color = combineColors(this.getUnitFeatureStyle().color, "#ffffff", 30);
		if (idx in this.unitIdxToGeometryCollectionIdx) {
			const _idx = this.unitIdxToGeometryCollectionIdx[idx];
			this.map.data[_idx + 1].group.getLayers().forEach(layer => {
				this.map.setLayerStyle(layer, {color});
			});
		} else {
			const _idx = this.unitIdxToGeometryIdx[idx];
			const layer = this.map.getLayerByIdxTuple([0, _idx]);
			layer && this.map.setLayerStyle(layer, {color});
		}
	};

	endHighlight = (idx) => {
		const color = this.getUnitFeatureStyle().color;
		if (idx in this.unitIdxToGeometryCollectionIdx) {
			const _idx = this.unitIdxToGeometryCollectionIdx[idx];
			this.map.data[_idx + 1].group.getLayers().forEach(layer => {
				this.map.setLayerStyle(layer, {color});
			});
		} else {
			const _idx = this.unitIdxToGeometryIdx[idx];
			const layer = this.map.getLayerByIdxTuple([0, _idx]);
			layer && this.map.setLayerStyle(layer, {color});
		}
	};

	onMouseOver = (unitIdx) => (e, {feature}) => {
		const idx = unitIdx !== undefined ? unitIdx : feature.properties.idx;

		if (idx === undefined) {
			return;
		}

		this._highlightedUnit = idx;
		this.startHighlight(idx);

		const id = `${this.props.idSchema.$id}_${this.state.activeIdx}_units_${idx}`;
		this.highlightedElem = getSchemaElementById(this.props.formContext.contextId, id);

		if (this.highlightedElem) {
			this.highlightedElem.className += " map-highlight";
		}
	}

	onMouseOut = (unitIdx) => (e, {feature}) => {
		const idx = unitIdx !== undefined ? unitIdx : feature.properties.idx;

		if (idx === undefined) {
			return;
		}

		this._highlightedUnit = undefined;
		this.endHighlight(idx);

		if (this.highlightedElem) {
			this.highlightedElem.className = this.highlightedElem.className.replace(" map-highlight", "");
		}
	}

	getData()  {
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

	getGeometries() {
		const {gatherings, units} = this.getData();
		return [
			...parseGeometries(gatherings),
			...parseGeometries(units)
		];
	}

	onUnitChange = (unitIdx) => (events) => {
		events.forEach(e => {
			switch (e.type) {
			case "delete":
				this.onUnitRemove(e, unitIdx);
				break;
			case "edit":
				this.onUnitEdited(e, unitIdx);
				break;
			}
		});
	}

	onUnitRemove = (e, unitIdx) => {
		if (unitIdx === undefined) { // Isn't a geometry collection (unitIdx stored in feature properties)
			const idxs = e.idxs.map(idx => this.unitFeatures[idx].properties.idx);
			const {formData} = this.props;

			const unitIdxs = idxs;

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
		} else { // Is a geometry collection.
			const {idxs} = e;
			this.props.onChange(update(this.props.formData, {
				[this.state.activeIdx]: {
					units: {
						[unitIdx]: {
							unitGathering: {
								geometry: {
									geometries: {
										$splice: idxs.sort().reverse().map(idx => [idx, 1])
									}
								}
							}
						}
					}
				}
			}));
		}
	}

	onUnitEdited = ({features}, unitIdx) => {
		if (unitIdx === undefined) { // Isn't a geometry collection (unitIdx stored in feature properties)
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
		} else { // Is a geometry collection.
			this.props.onChange(update(this.props.formData, {
				[this.state.activeIdx]: {
					units: {
						[unitIdx]: {
							unitGathering: {
								geometry: {$set: Object.keys(features).reduce((geometryCollection, idx) => {
									const feature = features[idx];
									geometryCollection.geometries[idx] = feature.geometry;
									return geometryCollection;
								}, this.props.formData[this.state.activeIdx].units[unitIdx].unitGathering.geometry)
								}
							}
						}
					}
				}
			}));
		}
	}

	parsePopupPointer(col, options) {
		return col.replace("[idx]", options.feature.properties.idx);
	}
}

@_MapArrayField
class LineTransectMapArrayField extends Component {
	constructor(props) {
		super(props);
		this.state = {showLTTools: false};
	}
	
	getOptions() {
		const {formData, disabled, readonly} = this.props;
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
				getTooltip: this.getTooltip,
				editable: !disabled && !readonly
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

@_MapArrayField
class LolifeMapArrayField extends Component {
	constructor(props) {
		super(props);
		this.onMouseOver = this.onMouseOver.bind(this);
		this.onMouseOut = this.onMouseOut.bind(this);
		this.startHighlight = this.startHighlight.bind(this);
		this.endHighlight = this.endHighlight.bind(this);
		this.onChanges = {};
	}

	componentDidMount() {
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "startHighlight", (...params) => this.startHighlight(...params));
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "endHighlight", (...params) => this.endHighlight(...params));
	}

	componentWillUnmount() {
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "startHighlight");
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "endHighlight");
	}

	getOptions() {
		const data = this.getData();
		return {
			draw: false,
			data,
			controls: true
		};
	}

	getData() {
		return [
			{
				featureCollection: {
					type: "FeatureCollection",
					features: parseGeometries(getUiOptions(this.props.uiSchema).data).map(g => ({type: "Feature", geometry: g, properties: {}}))
				},
				getFeatureStyle: this.namedPlaceStyle
			},
			...this._getData(this.props.formData)
		];
	}

	_getData(formData) {
		// Store so change detection doesn't think it's a new function.
		return (formData || []).map((gathering, idx) => {
			const onChangeForIdx = this.onChanges[idx] || this.onChangeForIdx(idx);
			this.onChanges[idx] = onChangeForIdx;
			return {
				featureCollection: {type: "FeatureCollection", features: parseGeometries(gathering.geometry).map(g => ({type: "Feature", properties: {idx}, geometry: g}))},
				getFeatureStyle: this.getFeatureStyle(gathering),
				on: {
					mouseover: this.onMouseOver,
					mouseout: this.onMouseOut,
					click: this.onClick
				},
				onChange: onChangeForIdx,
				editable: true,
				getPopup: this.getPopup
			};
		});
	}

	getGeometries() {
		return this._getGeometries(this.getData());
	}

	_getGeometries(data) {
		return data.reduce((geometries, {featureCollection}) => [
			...geometries,
			...featureCollection.features.map(f => f.geometry)
		], []);
	}

	onChangeForIdx = (idx) => (events) => {
		let formData = this.getGatherings ? this.getGatherings() : this.props.formData;
		events.forEach(e => {
			switch (e.type) {
			case "edit":
				formData = update(formData,
					formData[idx].geometry.type === "GeometryCollection"
					?  Object.keys(e.features).reduce((updates, _idx) => ({
						...updates,
						[idx]: {geometry: {geometries: {[_idx]: {$set: e.features[_idx].geometry}}}}
					}), {})
					: {[idx]: {geometry: {$set: e.features[0].geometry}}}
				);
				break;
			case "create":
				formData = update(formData, {[idx]: {geometry: {$set: e.feature.geometry}}});
				break;
			case "delete":
				if (formData[idx].geometry.type === "GeometryCollection") {
					let splices = [];
					e.idxs.sort().reverse().forEach((idx) => {
						splices.push([idx, 1]);
					});
					formData = update(formData, {[idx]: {geometry: {geometries: {$splice: splices}}}});
				} else {
					formData = update(formData, {[idx]: {geometry: {$set: undefined}}});
				}
				break;
			}
		});
		this.onGatheringChange(formData);
	}

	onGatheringChange(formData) {
		this.props.onChange(formData);
	}

	namedPlaceStyle() {return {color: "#aaaaaa", fillOpacity: 0.2};}
	foragingStyle() {return {color: "#ffc000"};}
	breedingAndRestingStyle() {return {color: "#a9d18e"};}
	cavityTreeStyle() {return {color: "#9e713b"};}
	droppingsTreeStyle() {return {color: "#b89220"};}
	nestTreeStyle() {return {color: "#ff0000"};}
	observationStyle() {return {color: NORMAL_COLOR};}

	getFeatureStyle(gathering) {
		const {gatheringType} = gathering;
		switch (gatheringType) {
		case "MY.gatheringTypeForagingArea":
			return this.foragingStyle;
		case "MY.gatheringTypeBreedingAndRestingArea": 
			return this.breedingAndRestingStyle;
		case "MY.gatheringTypeCavityTree": 
			return this.cavityTreeStyle;
		case "MY.gatheringTypeDroppingsTree": 
			return this.droppingsTreeStyle;
		case "MY.gatheringTypeNestTree": 
			return this.nestTreeStyle;
		default:
			return this.observationStyle;
		}
	}

	getIdForDataIdx(idx) {
		return `${this.props.idSchema.$id}_${idx}`;
	}

	onMouseOver(e, {dataIdx}) {
		const idx = dataIdx - 1;
		this.startHighlight(idx);

		const id = this.getIdForDataIdx(idx);
		this.highlightedElem = getSchemaElementById(this.props.formContext.contextId, id);

		if (this.highlightedElem) {
			this.highlightedElem.className += " map-highlight";
		}
	}

	onMouseOut(e, {dataIdx}) {
		const idx = dataIdx - 1;
		this.endHighlight(idx);

		const id = this.getIdForDataIdx(idx);
		this.highlightedElem = getSchemaElementById(this.props.formContext.contextId, id);

		if (this.highlightedElem) {
			this.highlightedElem.className = this.highlightedElem.className.replace(" map-highlight", "");
		}
	}

	startHighlight(idx) {
		idx = isNaN(idx) ? 0 : idx + 1;
		let {color} = this.map.data[idx].getFeatureStyle();
		if (!color) {
			return;
		}
		color = combineColors(color, "#ffffff", 150);
		const layer = this.map.getLayerByIdxTuple([idx, 0]);
		layer && this.map.setLayerStyle(layer, {color, fillColor: color});
	}

	endHighlight(idx) {
		idx = isNaN(idx) ? 0 : idx + 1;
		const {color} = this.map.data[idx].getFeatureStyle();
		if (!color) {
			return;
		}
		const layer = this.map.getLayerByIdxTuple([idx, 0]);
		layer && this.map.setLayerStyle(layer, {color, fillColor: color});
	}

	onClick = (e, {dataIdx}) => {
		const {contextId, topOffset, bottomOffset} = this.props.formContext;
		const idx = dataIdx - 1;
		scrollIntoViewIfNeeded(getSchemaElementById(contextId, this.getIdForDataIdx(idx)), topOffset, bottomOffset);
	}

	getFormDataForPopup({feature}) {
		return this.props.formData[feature.properties.idx];
	}
}

@_MapArrayField
class LolifeNamedPlaceMapArrayField extends LolifeMapArrayField {
	getData() {
		const data = super._getData(this.props.formData.prepopulatedDocument.gatherings);
		const namedPlaceGeom = this.getNamedPlaceGeometry();
		return [
			{
				featureCollection: {
					type: "FeatureCollection",
					features: namedPlaceGeom ? [{type: "Feature", properties: {}, geometry: namedPlaceGeom}] : []
				},
				getFeatureStyle: this.getNamedPlaceStyle,
				editable: true,
				onChange: this.onChange,
				getPopup: this.getPopup
			},
			...data
		];
	}

	getNamedPlaceStyle = () => ({fillOpacity: 0.6, color: NORMAL_COLOR})

	getNamedPlaceGeometry() {
		const {geometry} = this.props.formData;
		return geometry && Object.keys(geometry).length ? this.props.formData.geometry : undefined;
	}

	getGeometries() {
		const namedPlaceGeometry = this.getNamedPlaceGeometry();
		const geometries = super._getGeometries(super._getData(this.props.formData.prepopulatedDocument.gatherings));
		return namedPlaceGeometry ? [
			namedPlaceGeometry,
			...geometries
		] : geometries;
	}

	onChange = (events) => {
		let geometry;
		events.forEach(e => {
			switch (e.type) {
			case "create":
				geometry = {
					type: "GeometryCollection",
					geometries: [e.feature.geometry]
				};
				break;
			case "edit":
				geometry = {
					type: "GeometryCollection",
					geometries: [e.features[0].geometry]
				};
				break;
			case "delete":
				geometry = {
					type: "GeometryCollection",
					geometries: []
				};
			}
		});
		this.props.onChange({...this.props.formData, geometry});
	}

	getGatherings() {
		return this.props.formData.prepopulatedDocument.gatherings;
	}

	onGatheringChange(formData) {
		this.props.onChange({
			...this.props.formData,
			prepopulatedDocument: {
				...this.props.formData.prepopulatedDocument.gatherings,
				gatherings: formData
			}});
	}

	getIdForDataIdx(idx) {
		return `${this.props.idSchema.$id}_prepopulatedDocument_gatherings_${idx}`;
	}

	getFormDataForPopup() {
		return this.props.formData;
	}

	parsePopupPointer(col, options) {
		return col.replace("[idx]", options.feature.properties.idx);
	}
}

function _MapArrayField(ComposedComponent) { return (
@BaseComponent
class _MapArrayField extends ComposedComponent {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				geometryField: PropTypes.string,
				// Strategy for getting geometry data.
				geometryMapper: PropTypes.oneOf(["default", "units", "lineTransect", "lolife", "lolifeNamedPlace"]),
				topOffset: PropTypes.integer,
				bottomOffset: PropTypes.integer,
				popupFields: PropTypes.arrayOf(PropTypes.object),
				mapSizes: PropTypes.shape({
					lg: PropTypes.integer,
					md: PropTypes.integer,
					sm: PropTypes.integer,
					xs: PropTypes.integer
				})
			}).isRequired,
			data: PropTypes.arrayOf(PropTypes.shape({
				geometryField: PropTypes.string.isRequired
			}))
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array", "object"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired
	}

	constructor(props) {
		super(props);
		this._context = new Context(`${props.formContext.contextId}_MAP_CONTAINER`);
		this._context.featureIdxsToItemIdxs = {};
		this._context.setState = (state, callback) => this.setState(state, callback);

		const initialState = {activeIdx: (this.props.formData || []).length === 1 ? 0 : undefined};
		const options = getUiOptions(props.uiSchema);
		if ((this.props.formData || []).length && "activeIdx" in options) initialState.activeIdx = options.activeIdx;
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
		super.afterActiveChange && super.afterActiveChange(idx);
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

		// Zoom map to area. Area ID is accessed from schema field defined in options.areaField
		const item = this.props.schema.type === "array" ? (this.props.formData || [])[this.state.activeIdx] : this.props.formData;
		const {areaField} = getUiOptions(this.props.uiSchema);
		if (!item || !areaField) {
			return;
		}
		let area = item[areaField];
		if (area instanceof Array) {
			area = area[0];
		}
		const geometries = this.getGeometries();
		if (geometries.length === 0 && area && area.length > 0) {
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

	getContainer = () => findDOMNode(this.refs._stretch)
	onResize = () => this.refs.map.map.map.invalidateSize({debounceMoveend: true})
	onPopupClose = () => {
		// Move popup content back to the React container so React won't crash.
		if (this.refs.popupContainer && this.refs.popup.refs.popup) {
			findDOMNode(this.refs.popupContainer).appendChild(this.refs.popup.refs.popup);
		}
		this.setState({popupIdx: undefined});
	}
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
		const changes = {};
		if (options.createOnLocate && !_options.locate) {
			changes.locate = [this.onLocate];
		}
		const {readonly, disabled} = this.props;
		if (readonly || disabled) {
			if (isObject(_options.draw)) {
				changes.draw = {
					..._options.draw,
					editable: false
				};
			}
			if (_options.data) {
				if (_options.data instanceof Array) {
					changes.data = _options.data.map(d => ({...d, editable: false}));
				} else if (isObject(_options.data)) {
					changes.data = {..._options.data, editable: false};
				}
			}
		}
		if (Object.keys(changes).length) {
			_options = {
				..._options,
				...changes
			};
		}
		return _options;
	}

	onActiveChange = (idx, prop, callback) => {
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

	getSchemas() {
		if (super.getSchemas) return super.getSchemas();
		 return this.props;
	}

	render() {
		const {registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema, errorSchema, schema} = this.getSchemas();
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

		const childProps = schema.type === "array"
			? getChildProps()
			: {...this.props, uiSchema: getInnerUiSchema(this.props.uiSchema)};
		const inlineSchemaProps = schema.type === "array"
			? putChildsToParents(getPropsForFields(childProps, Object.keys(schema.items.properties).filter(field => !(belowFields || []).includes(field))))
			: childProps;

		const belowSchemaProps = belowFields ? putChildsToParents(getPropsForFields(childProps, belowFields)) : null;

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

		const {buttonsPath, addButtonPath, showErrors = true} = getUiOptions(this.props.uiSchema);
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
		if (options.buttons) {
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

		const inlineSchema = <SchemaField {...defaultProps} {...inlineSchemaProps} uiSchema={inlineUiSchema} {...overrideProps} />;
		const belowSchema = belowFields ? <SchemaField {...this.props} {...belowSchemaProps} uiSchema={belowUiSchema} /> : null;

		buttons = buttons && (!_buttonsPath || mapOptions.emptyMode)
			? buttons.map(button => getButton(button, {
				canAdd: mapOptions.emptyMode ? button.fnName === "addNamedPlace" : true,
				uiSchema: this.props.uiSchema,
				idSchema: this.props.idSchema,
				formData: this.props.formData,
				formContext: this.props.formContext,
				disabled: this.props.disabled,
				readonly: this.props.readonly,
			})).filter(button => button)
			: undefined;

		const _errors = errorSchema && parseJSONPointer(schema.type === "array" ? (errorSchema[activeIdx] || {}) : errorSchema, geometryField);
		const errors = _errors
			? _errors.__errors.map(formatErrorMessage)
			: null;

		const errorId = geometryField && geometryField[0] === "/" ? geometryField.replace(/\//g, "_") : `_${geometryField}`;
		const wholeErrorId = this.props.schema.type === "array"
			? `${this.props.idSchema.$id}_${activeIdx}${errorId}`
			: `${this.props.idSchema.$id}${errorId}`;
		const mapPropsToPass = {
			formContext: this.props.formContext,
			onPopupClose: this.onPopupClose,
			markerPopupOffset: 45,
			featurePopupOffset: 5,
			popupOnHover: true,
			onFocusGrab: this.onFocusGrab,
			onFocusRelease: this.onFocusRelease,
			panel: errors && showErrors ? {
				header: this.props.formContext.translations.Error,
				panelTextContent: <div>{errors}</div>,
				bsStyle: "danger",
				id: `laji-form-error-container-${wholeErrorId}`
			} : null,
			draw: false,
			zoomToData: true,
			onOptionsChanged: this.onOptionsChanged,
			fullscreenable: true,
			...mapOptions
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
			minHeight: getUiOptions(this.props.uiSchema).minHeight,
			onEnterViewPort: this.onEnterViewPort,
			enterViewPortTreshold: 200
		};

		const wrappedMap = (
			<Stretch {...wrapperProps}  ref="stretch">
				{map}
			</Stretch>
		);
		const {TitleField} = this.props.registry.fields;

		return (
			<React.Fragment>
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
					<div style={{display: "none"}} ref="popupContainer">
						<Popup data={this.getPopupData(this.state.popupIdx)} ref="popup"/>
					</div> : null}
				<Row>
					{mapOptions.emptyMode ? null : belowSchema}
				</Row>
				{renderButtonsBelow && !mapOptions.emptyMode && buttons.length ? (
					<Row className="map-array-field-below-buttons">
						<TitleField title={getUiOptions(uiSchema).buttonsTitle} />
						<ButtonToolbar>{buttons}</ButtonToolbar>
					</Row>
					): null}
			</React.Fragment>
		);
	}

	getDraftStyle = () => {
		return {color: "#25B4CA", opacity: 1};
	}

	getUnitFeatureStyle = () => {
		let color = "#55AEFA";
		if (this._highlightedUnit !== undefined) {
			color = combineColors(color, "#ffffff", 30);
		}
		return {color: color, fillColor: color, weight: 4};
	}

	mapKeyFunctions = {
		splitLineTransectByMeters: () => {
			this.map.splitLTByMeters(this.state.activeIdx);
		}
	};

	filterPopupOptions({dataIdx, featureIdx, feature}) {
		return {dataIdx, featureIdx, feature};
	}

	getPopup = (options, openPopupCallback) => {
		if (!this.refs.popup) return;
		this.setState({popupIdx: this.filterPopupOptions(options)}, () => {
			this.refs.popup && hasData(this.getPopupData(options)) && openPopupCallback(this.refs.popup.refs.popup);
		});
	}

	getPopupData(options) {
		if (super.getPopupData) {
			return super.getPopupData(options);
		} else {
			return this.getFeaturePopupData(options);
		}
	}

	getFormDataForPopup(options) {
		if (super.getFormDataForPopup) {
			return super.getFormDataForPopup(options);
		} else {
			return this.state.activeIdx !== undefined ? this.props.formData[this.state.activeIdx] : undefined;
		}
	}

	getFeaturePopupData = (options) => {
		if (!options) return [];

		const {popupFields} = getUiOptions(this.props.uiSchema);
		const formData = this.getFormDataForPopup(options)

		let data = [];

		popupFields.forEach(({field: col, template, value: _value, title: _title, if: _if}) => {
			let value, title;
			if (_value) {
				value = _value;
				title = _title;
			} else if (col) {
				if (this.parsePopupPointer) {
					col = this.parsePopupPointer(col, options);
				}
				const _formData = parseJSONPointer(formData, col);
				const schema = parseSchemaFromFormDataPointer(this.props.schema.items || this.props.schema, col);
				const uiSchema = parseUiSchemaFromFormDataPointer(this.props.uiSchema.items || this.props.uiSchema, col);
				title = schema.title;
				value = formatValue({...this.props, formData: _formData, schema, uiSchema});
			}

			if (!isEmptyString(value)) {
				let result;
				if (_if) {
					result = ["dataIdx", "featureIdx"].every(opt => !_if.hasOwnProperty(opt) || options[opt] === _if[opt])
					if (_if.reverse) {
						result = !result;
					}
				}
				if (!_if || result) {
					data.push({title, template, value});
				}
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
		const {createOnLocate} = getUiOptions(this.props.uiSchema);
		if (!createOnLocate) return;

		const geometry = this.getGeometry();
		if (this.props.formData.length === 0 || (!geometry || !Object.keys(geometry).length)) {
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
		return data && data.length &&
			<ul ref="popup" className="map-data-tooltip">
				{data.map(({value, title, template}, i) => {
					switch (template) {
					case "title":
						return <li key={title || i}><strong>{Array.isArray(value) ? value.join(", ") : value}</strong></li>;
					case "description":
						return <li key={title || i}><i>{Array.isArray(value) ? value.join(", ") : value}</i></li>;
					default:
						return <li key={title || i}><strong>{title}:</strong> {Array.isArray(value) ? value.join(", ") : value}</li>;
					}
				})}
			</ul>;
	}
}

export class MapComponent extends Component {
	constructor(props) {
		super(props);
		this.state = {mapOptions: {}};
		this.mainContext = new Context(props.formContext.contextId);
		this._context = new Context(`${props.formContext.contextId}_MAP`);
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
		const {panel, onFocusGrab, onFocusRelease, onOptionsChanged, ...mapOptions} = this.props; // eslint-disable-line

		const controlledPanel = panel ?
			<MapPanel id={panel.id}
			          bsStyle={panel.bsStyle || undefined}
			          buttonBsStyle={panel.buttonBsStyle}
			          header={panel.header}
			          text={panel.panelTextContent} />
			: null;

		return (
			<div className={"laji-form-map-container" + (this.state.focusGrabbed ? " pass-block" : "")}>
				{controlledPanel}
				{this.state.panel ?
					<MapPanel id={panel.id}
					          show={this.state.panel}
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

	constructor(props) {
		super(props);
		this.state = {fullscreen: false};
	}

	componentDidMount() {
		this.mounted = true;
		let options = {...this.props};

		// Backward compatibility for bad settings.
		["tileLayerName", "overlayNames", "tileLayerOpacity"].forEach(prop => {
			if (prop in options && options[prop] === undefined) {
				options = immutableDelete(options, prop);
			}
		});

		if (this.props.hidden) {
			return;
		}

		this.initializeMap(options);
	}

	componentWillUnmount() {
		!this.props.singleton && this.map && this.map.destroy();
		if (this.hasSingletonHandle) {
			new Context(this.props.formContext.contextId).onSingletonHandleGrabbed = undefined;
		}
		this.mounted = false;
	}

	componentDidUpdate(prevProps, prevState) {
		const {hidden, onComponentDidMount, singleton} = this.props;
		const {...props} = this.props;
		if (!singleton || this.hasSingletonHandle) {

			if (this.map && prevProps.lineTransect && props.lineTransect && "activeIdx" in props.lineTransect) {
				this.map.setLTActiveIdx(props.lineTransect.activeIdx);
			}
			if (prevProps.lineTransect) delete props.lineTransect;

			this.setMapOptions(prevProps, this.props);
		}

		if (!hidden && !this.map) {
			this.initializeMap(props);
			if (onComponentDidMount) onComponentDidMount(this.map);
		}

		if (this.state.fullscreen && !prevState.fullscreen) {
			this._mapContainer = this.map.rootElem;
			this.map.setRootElem(findDOMNode(this.fullscreenRef));
			this.props.clickBeforeZoomAndPan && this.map.setOption("clickBeforeZoomAndPan", false);
		} else if (!this.state.fullscreen && prevState.fullscreen) {
			this.map.setRootElem(this._mapContainer);
			this.props.clickBeforeZoomAndPan && this.map.setOption("clickBeforeZoomAndPan", true);
		}
	}

	toggleFullscreen = () => {
		this.setState({fullscreen: !this.state.fullscreen});
	}

	getMapOptions = (props) => {
		const {
			className, // eslint-disable-line no-unused-vars
			style, // eslint-disable-line no-unused-vars
			hidden, // eslint-disable-line no-unused-vars
			singleton, // eslint-disable-line no-unused-vars
			emptyMode, // eslint-disable-line no-unused-vars
			onComponentDidMount, // eslint-disable-line no-unused-vars
			fullscreenable, // eslint-disable-line no-unused-vars
			formContext, // eslint-disable-line no-unused-vars
			controlSettings, // eslint-disable-line no-unused-vars
			...mapOptions
		} = props;
		return mapOptions;
	}

	getEnhancedMapOptions = (props) => {
		const mapOptions = this.getMapOptions(props);
		const {fullscreenable, formContext = {}} = props;

		if (fullscreenable) {
			mapOptions.customControls = [
				...(mapOptions.customControls || []),
				{
					iconCls: `glyphicon glyphicon-resize-${this.state.fullscreen ? "small" : "full"}`,
					fn: this.toggleFullscreen,
					position: "bottomright",
					text: formContext.translations[this.state.fullscreen ? "MapExitFullscreen" : "MapFullscreen"]
				}
			];
			mapOptions.bodyAsDialogRoot = mapOptions.bodyAsDialogRoot !== undefined
				? mapOptions.bodyAsDialogRoot
				: !this.state.fullscreen;
		}
		mapOptions.lang = mapOptions.lang || formContext.lang;
		mapOptions.googleApiKey = formContext.googleApiKey;
		mapOptions.rootElem = this.refs.map;
		return mapOptions;
	}

	setMapOptions = (prevOptions, options) => {
		if (!this.map) {
			return;
		}

		const mapOptions = this.getMapOptions(options);
		const prevMapOptions = this.getMapOptions(prevOptions);
		Object.keys(mapOptions).forEach(key => {
			switch (key) {
			case "draw": // More optimal way of updating draw data than setting the draw option
				if (!deepEquals(mapOptions.draw, prevMapOptions.draw)) {
					this.map.updateDrawData(mapOptions.draw);
				}
				break;
			case "rootElem": // deeqEquals on DOM node causes maximum call stack size exceeding.
				if (mapOptions[key] !== prevMapOptions[key]) {
					this.map.setOption(key, mapOptions[key]);
				}
				break;
			default:
				if (!deepEquals(mapOptions[key], prevMapOptions[key])) {
					this.map.setOption(key, mapOptions[key]);
					if (this.props.singleton && mapOptions.zoomToData && key === "data") {
						this.map.zoomToData(mapOptions.zoomToData);
					}
				}
			}
		});
	}

	initializeMap = (props) => {
		const mapOptions = this.getEnhancedMapOptions(props);
		if (props.singleton) {
			const context = new Context(props.formContext.contextId);
			context.onSingletonHandleGrabbed && context.onSingletonHandleGrabbed();
			this.hasSingletonHandle = true;
			if (!context.singletonMap) {
				context.singletonMap = new LajiMap(mapOptions);
				this.map = context.singletonMap;
				this.mounted && props.singleton && this.hasSingletonHandle && props.zoomToData && this.map.zoomToData(props.zoomToData);
			} else {
				this.map = context.singletonMap;
				this.setMapOptions(context.singletonMap.getOptions(), mapOptions);
			}
			context.onSingletonHandleGrabbed = () => {
				this.hasSingletonHandle = false;
			};
		} else {
			this.map = new LajiMap(mapOptions);
		}
		this.map.map.invalidateSize();
		if (props.onComponentDidMount) props.onComponentDidMount(this.map);
	}

	setFullscreenRef = (elem) => {
		this.fullscreenRef = elem;
	}

	render() {
		return (
			<React.Fragment>
				<div key="map"
					className={"laji-form-map" + (this.props.className ? " " + this.props.className : "")}
					style={this.props.style} ref="map" />
				<FullscreenPortal ref={this.setFullscreenRef} on={this.state.fullscreen} />
		 </React.Fragment>
		);
	}
}

const FullscreenPortal = React.forwardRef((props, ref) => {
	return props.on && createPortal(
		<div className="laji-form map-fullscreen" ref={ref} />,
		document.body
	);
});

class MapPanel extends Component {
	render() {
		return (
				<Panel bsStyle={this.props.bsStyle || undefined} className="laji-form-popped" id={this.props.id}>
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
