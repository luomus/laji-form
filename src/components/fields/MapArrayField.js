import * as React from "react";
import * as PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import update from "immutability-helper";
import * as deepEquals from "deep-equal";
import * as merge from "deepmerge";
import LajiMap from "laji-map";
import { combineColors } from "laji-map/lib/utils";
import { NORMAL_COLOR }  from "laji-map/lib/globals";
import { Row, Col, Panel, Popover, ButtonToolbar, Modal } from "react-bootstrap";
import * as PanelHeading from "react-bootstrap/lib/PanelHeading";
import * as PanelBody from "react-bootstrap/lib/PanelBody";
import { Button, Stretch, Fullscreen } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, immutableDelete, getSchemaElementById, getBootstrapCols, isNullOrUndefined, parseJSONPointer, injectButtons, focusAndScroll, formatErrorMessage, getUpdateObjectFromJSONPointer, isEmptyString, isObject, formatValue, parseSchemaFromFormDataPointer, parseUiSchemaFromFormDataPointer, scrollIntoViewIfNeeded, updateSafelyWithJSONPointer, getUUID, highlightElem } from "../../utils";
import { getDefaultFormState, toIdSchema } from "@rjsf/core/dist/cjs/utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import { getPropsForFields } from "./NestField";
import { getButton } from "../ArrayFieldTemplate";
import { onArrayFieldChange } from "./ArrayField";

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


export default class MapArrayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				geometryField: PropTypes.string,
				// Strategy for getting geometry data.
				geometryMapper: PropTypes.oneOf(["default", "units", "lineTransect", "lolife", "lolifeNamedPlace"]),
				topOffset: PropTypes.number,
				bottomOffset: PropTypes.number,
				popupFields: PropTypes.arrayOf(PropTypes.object),
				computeAreaField: PropTypes.string,
				areaInHectares: PropTypes.bool,
				mapSizes: PropTypes.shape({
					lg: PropTypes.number,
					md: PropTypes.number,
					sm: PropTypes.number,
					xs: PropTypes.number
				}),
				data: PropTypes.arrayOf(PropTypes.shape({
					geometryField: PropTypes.string.isRequired
				})),
				help: PropTypes.string
			}).isRequired,
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
	}

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
		}
	}
}

@_MapArrayField
class DefaultMapArrayField extends React.Component {
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
			: {draw: false};

		const data = geometries && geometries.length || !options.placeholderGeometry
			? []
			: [{
				geoData: options.placeholderGeometry,
				getFeatureStyle: this._getPlaceholderStyle
			}];

		const extraData = (options.data || []).map((dataItem) => (
				{geoData: dataItem.geometryField ? this.getGeometry(formData, dataItem.geometryField) : dataItem}
		));

		return {draw, controls, emptyMode, data: [...data, ...extraData]};
	}

	onMapChangeCreateGathering(events) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		if (!geometryField) {
			return;
		}
		let formData = getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions);
		const geometries = events.filter(e => e.type === "create").map(e => e.feature.geometry);

		let splittedPath = geometryField.split("/").filter(s => !isEmptyString(s));

		let _cumulatedPointer = "";
		let _schema = this.props.schema.items;
		formData = splittedPath.reduce((_formData, split, i) => {
			_cumulatedPointer += `/${split}`;
			_schema = _schema.properties
				? _schema.properties[split]
				: _schema.items;
			return update(_formData, getUpdateObjectFromJSONPointer(_cumulatedPointer,
				{$set: i === splittedPath.length - 1
					? {
						type: "GeometryCollection",
						geometries
					}
					: getDefaultFormState(_schema, undefined, this.props.registry.definitions)
				}
			));
		}, formData);

		this.props.onChange(onArrayFieldChange([formData], this.props));
		this.setState({activeIdx: 0});
	}

	getGeometry(formData, _geometryField) {
		const {uiSchema} = this.props;
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
		const geometryItem = this.getGeometry(this.props.formData);
		if (geometryItem && geometryItem.type) {
			return parseGeometries(geometryItem);
		}
		return [];
	}

	onChange(events) {
		let formData = this.props.formData ||
			[getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)];
		let addOrDelete = false;
		events.forEach(e => {
			switch (e.type) {
			case "create":
				addOrDelete = true;
				formData = this.onAdd(e, formData);
				break;
			case "delete":
				addOrDelete = true;
				formData = this.onRemove(e, formData);
				break;
			case "edit":
				formData = this.onEdited(e, formData);
				break;
			case "insert":
				addOrDelete = true;
				formData = this.onInsert(e, formData);
				break;
			}
		});
		this.props.onChange(addOrDelete ? onArrayFieldChange(formData, this.props) : formData);
	}

	onAdd({feature: {geometry}}, formData) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		return update(formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPointer(geometryField, {$set: {type: "GeometryCollection", geometries: [
				...parseGeometries(this.getGeometry(formData)), geometry
			]}})});
	}

	onRemove({idxs}, formData) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		let splices = [];
		idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		const geometry = this.getGeometry(formData);
		return update(formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPointer(geometryField, geometry && geometry.type === "GeometryCollection" ?
				{geometries: {$splice: splices}} : {$set: undefined}
			)});
	}

	onEdited({features}, formData) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		const geometry = this.getGeometry(formData);
		return update(formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPointer(geometryField, geometry.type === "GeometryCollection" ? {
				geometries: Object.keys(features).reduce((obj, idx) => {
					obj[idx] = {$set: features[idx].geometry};
					return obj;
				}, {})
			} : {$set: features[0].geometry}
			)});
	}

	onInsert({idx, feature}, formData) {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		return update(formData,
			{[this.state.activeIdx]: getUpdateObjectFromJSONPointer(geometryField, {
				geometries: {$splice: [[idx, 0, feature.geometry]]}
			})});
	}

	afterActiveChange(idx) {
		if (idx === undefined) return;
		this.map.zoomToData();
	}
}

@_MapArrayField
class UnitsMapArrayField extends React.Component {
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
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "startHighlight", this.startHighlight);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "endHighlight", this.endHighlight);
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

	getUnitFeatureStyle = () => {
		let color = "#55AEFA";
		if (this._highlightedUnit !== undefined) {
			color = combineColors(color, "#ffffff", 30);
		}
		return {color: color, fillColor: color, weight: 4};
	}


	startHighlight = ({idx}) => {
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

	endHighlight = ({idx}) => {
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
		if (!formData) return {};

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
class LineTransectMapArrayField extends React.Component {
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
		this.props.onChange(onArrayFieldChange(update(this.props.formData, {0: {geometry: {$set:
			event.feature.geometry
		}}}), this.props));
	}

	onChange = (events) => {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		let state = {};
		let {formData} = this.props;
		let formDataChanged = false;
		let addOrDelete = false;
		events.forEach(e => {
			switch (e.type) {
			case "insert": {
				formDataChanged = true;
				addOrDelete = true;
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
				addOrDelete = true;
				formData = update(formData, {$splice: [[e.idx, 1]]});
				break;
			}
			case "merge": {
				formDataChanged = true;
				addOrDelete = true;
				const [first, second] = e.idxs;
				formData = update(formData, {[first]: {units: {$set: [
					...(formData[first].units || []),
					...(formData[second].units || [])
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
				this.props.onChange(addOrDelete ? onArrayFieldChange(formData, this.props) : formData);
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
		return props.formData && props.formData[0] && Object.keys(props.formData[0][geometryField] || {}).length;
	}

	focusOnMap = (idx) => {
		if (!this.hasLineTransectFeature(this.props)) {
			setTimeout(() => this.map.zoomToData({paddingInMeters: 200}));
			return;
		}
		this.getContext().setImmediate(() =>{
			this.map && this.map.fitBounds(L.featureGroup(this.map._corridorLayers[idx]).getBounds(), {paddingInMeters: 100}); // eslint-disable-line no-undef
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
class LolifeMapArrayField extends React.Component {
	constructor(props) {
		super(props);
		this.onMouseOver = this.onMouseOver.bind(this);
		this.onMouseOut = this.onMouseOut.bind(this);
		this.startHighlight = this.startHighlight.bind(this);
		this.endHighlight = this.endHighlight.bind(this);
		this.onChanges = {};
	}

	componentDidMount() {
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "startHighlight", this.startHighlight);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "endHighlight", this.endHighlight);
	}

	componentWillUnmount() {
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "startHighlight", this.startHighlight);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "endHighlight", this.endHighlight);
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.highlightedElem && prevState.activeIdx !== this.state.activeIdx) {
			this.highlightedElem.className = this.highlightedElem.className.replace(" map-highlight", "");
		}
	}

	getOptions() {
		const data = this.getData();
		return {
			draw: this.getDraw(),
			data,
			controls: {
				draw: {
					undo: false,
					redo: false
				}
			}
		};
	}

	getDraftStyle() {
		return this.getFeatureStyle({feature: {properties: {id: getUUID(this.props.formData[this.state.activeIdx])}}}, !!"higlight");
	}

	getDraw() {
		const active = this.props.formData[this.state.activeIdx];
		if (!active) {
			return false;
		}

		return {
			geoData: this.getFeatureCollection(active, {idx: this.state.activeIdx}),
			onChange: this.getOnChangeForIdx(this.state.activeIdx),
			getFeatureStyle: this.getFeatureStyle,
			getDraftStyle: this.getDraftStyle,
			marker: false,
			on: {
				mouseover: this.onMouseOver,
				mouseout: this.onMouseOut,
			},
		};
	}

	getOnChangeForIdx(idx) {
		// Store so change detection doesn't think it's a new function.
		const onChangeForIdx = this.onChanges[idx] || this.onChangeForGathering(idx);
		this.onChanges[idx] = onChangeForIdx;
		return onChangeForIdx;
	}

	getFeatureCollection(geometryContainer, properties = {}, geometryField = "/geometry") {
		return {type: "FeatureCollection", features: parseGeometries(parseJSONPointer(geometryContainer, geometryField)).map(g => ({type: "Feature", properties: {id: getUUID(geometryContainer), ...properties}, geometry: g}))};
	}

	getData() {
		return this._getData(this.props.formData);
	}

	_getData(formData) {
		let gatherings = (formData || []).map((gathering, idx) => (
			{
				featureCollection: this.getFeatureCollection(gathering, {idx}),
				getFeatureStyle: this.getFeatureStyle,
				on: {
					mouseover: this.onMouseOver,
					mouseout: this.onMouseOut,
					click: this.onClick
				},
				onChange: idx && this.getOnChangeForIdx(idx),
				editable: !!idx,
				getPopup: idx && this.getPopup
			}
		));

		const {activeIdx} = this.state;
		if (activeIdx !== undefined) {
			gatherings.splice(activeIdx, 1);
		}

		const units = (formData[0].units || []).map((unit, idx) => ({
			featureCollection: this.getFeatureCollection(unit, {unit: true, idx}, "/unitGathering/geometry"),
			editable: true,
			onChange: this.onChangeForUnits,
			getFeatureStyle: this.getUnitFeatureStyle,
			on: {
				mouseover: this.onMouseOver,
				mouseout: this.onMouseOut,
				click: this.onClick
			},
			getPopup: this.getPopup
		})).filter(item => item.featureCollection.features.length);

		return [...gatherings, ...units];
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

	onChangeForGathering = (idx) => (events) => {
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
		this.props.onChange(formData);
	}

	onChangeForUnits = (events) => {
		let formData = this.props.formData[0].units;
		events.forEach(e => {
			switch (e.type) {
			case "edit":
				formData = updateSafelyWithJSONPointer(formData, e.features[0].geometry, `/${e.features[0].properties.idx}/unitGathering/geometry`);
				break;
			case "create":
				throw new Error("Lolife map shouldn't me able to send create for unit");
			case "delete":
				formData = updateSafelyWithJSONPointer(formData, undefined, `/${e.features[0].properties.idx}/unitGathering/geometry`);
				break;
			}
		});
		this.props.onChange(updateSafelyWithJSONPointer(this.props.formData, formData, "/0/units"));
	}

	cavityTreeStyle() {return {color: "#9e713b"};}
	droppingsTreeStyle() {return {color: "#b89220"};}
	nestTreeStyle() {return {color: "#ff0000"};}
	observationStyle() {return {color: NORMAL_COLOR};}

	getFeatureStyle = ({feature}, highlight) => {
		if (!feature) {
			return {};
		}
		const namedPlaceStyle = {color: "#777777", fillOpacity: 0.2, weight: 6};
		const foragingStyle = {color: "#FFCD38"};
		const breedingAndRestingStyle = {color: "#a9d18e"};
		const accessStyle = {color: "#F489A7"};
		const coreZoneStyle = {color: "#F2764D"};
		const habitatZoneStyle = {color: "#937D32"};
		const applicableZoneStyle = {color: "#8EC0D1"};
		let idx = undefined;
		const gathering = this.props.formData.find((item, _idx) => {
			idx =_idx;
			return getUUID(item) === feature.properties.id;
		});
		if (!gathering) {
			return {};
		}
		let style;
		const {gatheringType} = gathering;
		switch (gatheringType) {
		case "MY.gatheringTypeForagingArea":
			style = foragingStyle;
			break;
		case "MY.gatheringTypeBreedingAndRestingArea": 
			style = breedingAndRestingStyle;
			break;
		case "MY.gatheringTypeLolifeAccess": 
			style = accessStyle;
			break;
		case "MY.gatheringTypeLolifeCoreZone": 
			style = coreZoneStyle;
			break;
		case "MY.gatheringTypeLolifeHabitatZone": 
			style = habitatZoneStyle;
			break;
		case "MY.gatheringTypeLolifeApplicableZone": 
			style = applicableZoneStyle;
			break;
		default:
			style = namedPlaceStyle;
		}

		const {activeIdx} = this.state;
		if (highlight || activeIdx !== undefined) {
			if (idx !== activeIdx) {
				return getFeatureStyleWithLowerOpacity(style);
			}
			return getFeatureStyleWithHighlight(style);
		}
		return style;
	}

	getUnitFeatureStyle = ({feature}) => {
		const droppingsTreeStyle = {color: "#b89220"};
		const nestTreeStyle = {color: "#9e713b"};
		const observationStyle = {color: NORMAL_COLOR};

		const unit = this.props.formData[0].units.find((item) => getUUID(item) === feature.properties.id);
		if (!unit) {
			return {};
		}
		const {nestType, indirectObservationType} = unit;
		let style = observationStyle;
		if (nestType) {
			style = nestTreeStyle;
		} else if (indirectObservationType) {
			style = droppingsTreeStyle;
		}

		const {activeIdx} = this.state;
		if (activeIdx !== undefined) {
			return getFeatureStyleWithLowerOpacity(style);
		}
		return style;
	}

	getHighlightElem(idx, unit) {
		if (unit) {
			return getSchemaElementById(this.props.formContext.contextId, `${this.props.idSchema.$id}_0_units_${idx}`);
		} else {
			return document.getElementById(`${this.props.idSchema.$id}_${idx}-panel`);
		}
	}

	onMouseOver(e, {feature}) {
		const {idx, unit} = feature.properties;

		if (!unit && !idx) {
			return;
		}

		this.highlightedElem = this.getHighlightElem(idx, unit);

		if (this.highlightedElem) {
			this.highlightedElem.className += " map-highlight";
		}
	}

	onMouseOut(e, {feature}) {
		const {idx, unit} = feature.properties;

		if (!unit && !idx) {
			return;
		}

		this.highlightedElem = this.getHighlightElem(idx, unit);

		if (this.highlightedElem) {
			this.highlightedElem.className = this.highlightedElem.className.replace(" map-highlight", "");
		}
	}

	startHighlight = ({id}) => {
		let mapIdx = this.map.data.findIndex(d => ((d.featureCollection.features[0] || {}).properties || {}).id === id);
		let style = this.map.data[mapIdx].getFeatureStyle({dataIdx: mapIdx, feature: this.map.data[mapIdx].featureCollection.features[0]});
		if (!style.color) {
			return;
		}
		const color = combineColors(style.color, "#ffffff", 150);
		const layer = this.map.getLayerByIdxTuple([mapIdx, 0]);
		layer && this.map.setLayerStyle(layer, {...style, color, fillColor: color});
	}

	endHighlight = ({id}) => {
		let mapIdx = this.map.data.findIndex(d => ((d.featureCollection.features[0] || {}).properties || {}).id === id);
		const style = this.map.data[mapIdx].getFeatureStyle({dataIdx: mapIdx, feature: this.map.data[mapIdx].featureCollection.features[0]});
		if (!style) {
			return;
		}
		if (!style.fillOpacity) {
			style.fillOpacity = 0.4; // LajiMap default fill opacity.
		}
		const layer = this.map.getLayerByIdxTuple([mapIdx, 0]);
		layer && this.map.setLayerStyle(layer, style);
	}

	onClick = (e, {feature}) => {
		const {idx, unit} = feature.properties;

		if (!unit && !idx) {
			return;
		}

		const {topOffset, bottomOffset} = this.props.formContext;
		if (!unit) {
			this.setState({activeIdx: idx});
		}
		const elem = this.getHighlightElem(idx, unit);
		scrollIntoViewIfNeeded(elem, topOffset, bottomOffset);
		highlightElem(elem);
	}

	getFormDataForPopup({feature}) {
		if (feature.properties.unit) {
			return this.props.formData[0].units.find(item => getUUID(item) === feature.properties.id);
		}
		return this.props.formData.find(item => getUUID(item) === feature.properties.id);
	}
}

function _MapArrayField(ComposedComponent) {
@BaseComponent
class _MapArrayField extends ComposedComponent {
	constructor(props) {
		super(props);
		this._context = new Context(`${props.formContext.contextId}_MAP_CONTAINER`);
		this._context.featureIdxsToItemIdxs = {};
		this._context.setState = (state, callback) => this.setState(state, callback);

		const initialState = {activeIdx: (this.props.formData || []).length === 1 ? 0 : undefined};
		const options = getUiOptions(props.uiSchema);
		if ((this.props.formData || []).length && "activeIdx" in options) initialState.activeIdx = options.activeIdx;
		this.state = {...initialState, ...(this.state || {})};

		this.getDraftStyle = this.getDraftStyle.bind(this);
	}

	componentDidMount() {
		if (super.componentDidMount) super.componentDidMount();
		this.setState({mounted: true});
		this.getContext().addKeyHandler(`${this.props.idSchema.$id}`, this.mapKeyFunctions);
		this.map = this.refs.map.refs.map.map;
		this._setActiveEventHandler = idx => {
			this.setState({activeIdx: idx});
		};
		this._zoomToDataEventHandler = () => {
			this._zoomToDataOnNextTick = true;
		};
		this._tileLayersEventHandler = (tileLayerOptions, callback) => {
			this._tileLayerNameOnNextTick = tileLayerOptions;
			this._tileLayerNameOnNextTickCallback = callback;
		};
		this._resizeEventHandler = () => {
			this.refs.stretch.invalidate();
		};
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "activeIdx", this._setActiveEventHandler);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "zoomToData", this._zoomToDataEventHandler);
		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "tileLayers", this._tileLayersEventHandler);

		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "resize", this._resizeEventHandler);

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
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "activeIdx", this._setActiveEventHandler);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "zoomToData", this._zoomToDataEventHandler);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "tileLayers", this._tileLayersEventHandler);
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "resize", this._resizeEventHandler);
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

		this.computeArea(prevProps);
	}

	geocode = () => {
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
		const geometries = this.getGeometries();
		if (geometries.length === 0 && area && area.length > 0) {
			this.props.formContext.apiClient.fetch(`/areas/${area}`, undefined, undefined).then((result)=>{
				this.map.geocode(result.name, undefined, 8);
			});
		}
	}

	computeArea = () => {
		const {activeIdx} = this.state;
		if (activeIdx === undefined) return;
		let {computeAreaField, areaInHectares} = getUiOptions(this.props.uiSchema);
		const {formData} = this.props;

		if (!computeAreaField) return;
		const geometries = this.getGeometries();
		const polygonsArea = geometries
			.filter(({type}) => type === "Polygon")
			.map(({coordinates}) => coordinates[0].slice(1).map(c => L.latLng(c.slice(0).reverse())))
			.reduce((area, latLngs) =>
				area + L.GeometryUtil.geodesicArea(latLngs)
			, 0);
		const circlesArea = geometries
			.filter(({type, radius}) => type === "Point" && radius)
			.reduce((_area, {radius}) => 
				_area + (Math.PI) * (radius * radius)
			, 0);
		const sumArea =  polygonsArea + circlesArea;
		const area = sumArea === 0
			? undefined
			: Math.round(areaInHectares ? sumArea / 10000 : sumArea);

		const currentArea = parseJSONPointer(formData[activeIdx], computeAreaField, true);
		currentArea !== area && this.props.onChange(updateSafelyWithJSONPointer(
			formData,
			area,
			`/${activeIdx}/${computeAreaField}`
		));
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
		this.props.onChange(onArrayFieldChange([...this.props.formData, getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)], this.props));
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
		const {popupFields, geometryField, topOffset, bottomOffset, belowFields, propsToPassToInlineSchema = [], emptyHelp, passActiveIdxToBelow = true} = options;
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
					buttons: [...(uiSchema["ui:options"].buttons || []), ...getUiOptions(this.props.uiSchema).buttons]
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
				uiSchema: uiSchema.items || {},
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

		const putChildsToParents = (props, key) => {
			if (!this.onChangeFor) {
				this.onChangeFor = {};
			}
			if (!this.onChangeFor[key]) {
				this.onChangeFor[key] = formData => {
					this.props.onChange(formData.map((item, idx) => {
						return {
							...(this.props.formData[idx] || getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)), 
							...item
						};
					}));
				};
			}
			return {
				...this.props,
				schema: {...schema, items: props.schema},
				uiSchema: {...uiSchema, items: props.uiSchema},
				onChange: this.onChangeFor[key]
			};
		};

		const defaultProps = {...this.props, schema, uiSchema};
		const overrideProps = propsToPassToInlineSchema.reduce((_props, field) => {
			_props[field] = this.props[field];
			return _props;
		}, {});

		const childProps = getChildProps();
		const inlineSchemaProps = putChildsToParents(getPropsForFields(childProps, Object.keys(schema.items.properties).filter(field => !(belowFields || []).includes(field))));

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
		belowUiSchema = {...belowUiSchema, "ui:options": {...(belowUiSchema["ui:options"] || {}), ...(passActiveIdxToBelow ? activeIdxProps : {})}};

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
		if (((this.props.formData || []).length === 0 || activeIdx !== undefined) && options.buttons) {
			if (_buttonsPath) {
				buttons = appendAddButton(options.buttons);
				belowUiSchema = injectButtons(belowUiSchema, buttons, _buttonsPath);
				inlineUiSchema["ui:options"].renderAdd = false;
			} else if (options.renderButtonsBelow) {
				buttons = appendAddButton(options.buttons);
				inlineUiSchema["ui:options"].renderAdd = false;
				renderButtonsBelow = true;
			}
		} 

		if (activeIdx === undefined || (!_buttonsPath && !renderButtonsBelow)) {
			inlineUiSchema["ui:options"].buttons = options.buttons || [];
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

		const _errors = errorSchema && parseJSONPointer(errorSchema[activeIdx] || {}, geometryField);
		const errors = _errors
			? _errors.__errors.map(formatErrorMessage)
			: null;

		const errorId = geometryField && geometryField[0] === "/" ? geometryField.replace(/\//g, "_") : `_${geometryField}`;
		const wholeErrorId = `${this.props.idSchema.$id}_${activeIdx}${errorId}`;
		const mapPropsToPass = {
			formContext: this.props.formContext,
			onPopupClose: this.onPopupClose,
			markerPopupOffset: 45,
			featurePopupOffset: 5,
			popupOnHover: true,
			onFocusGrab: this.onFocusGrab,
			onFocusRelease: this.onFocusRelease,
			panel: errors && errors.length && showErrors ? {
				header: this.props.formContext.translations.Error,
				panelTextContent: <div>{errors}</div>,
				bsStyle: "danger",
				id: `laji-form-error-container-${wholeErrorId}`
			} : null,
			draw: false,
			zoomToData: true,
			onOptionsChanged: this.onOptionsChanged,
			fullscreenable: true,
			help: options.help,
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

	getDraftStyle() {
		if (super.getDraftStyle) {
			return super.getDraftStyle();
		}
		return {color: "#25B4CA", opacity: 1};
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

	popupStrategies = {
		lolifeUnit: (formData) => {
			const {nestType, indirectObservationType, identifications} = formData;
			if (nestType) {
				return {value: this.props.formContext.translations.NestObservation};
			} else if (indirectObservationType) {
				return {value: this.props.formContext.translations.TraceObservation};
			} else if (identifications) {
				return {value: this.props.formContext.translations.Observation};
			}
		}
	}

	getFeaturePopupData = (options) => {
		if (!options) return [];

		const {popupFields} = getUiOptions(this.props.uiSchema);
		const formData = this.getFormDataForPopup(options);

		let data = [];

		popupFields.forEach(({field: col, template, value: _value, title: _title, if: _if, strategy}) => {
			let value, title;
			if (strategy) {
				const strategyResult = this.popupStrategies[strategy](formData);
				if (strategyResult) {
					value = strategyResult.value;
					title = strategyResult.title;
				}
			} else if (_value) {
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
					result = ["dataIdx", "featureIdx"].every(opt => !_if.hasOwnProperty(opt) || options[opt] === _if[opt]);
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

		const geometry = this.getGeometry(this.props.formData);
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
}
return _MapArrayField;
}

class Popup extends React.Component {
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

export class MapComponent extends React.Component {
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

	tileLayerChange = ({tileLayers}) => {
		this.setState({mapOptions: {...this.state.mapOptions, tileLayers}});
	}
	overlaysChange = ({overlayNames}) => {
		this.setState({mapOptions: {...this.state.mapOptions, overlayNames}});
	}
	tileLayerOpacityChangeEnd = ({tileLayerOpacity}) => {
		this.setState({mapOptions: {...this.state.mapOptions, tileLayerOpacity}});
	}
	locateToggle = ({locate}) => {
		this.setState({mapOptions: {...this.state.mapOptions, locate}});
	}

	componentDidMount() {
		this.map = this.refs.map.map;
		const {map} = this.map;
		this._context.map = this.map;

		map.on("tileLayersChange", this.tileLayerChange);
		map.on("locateToggle", this.locateToggle);
	}

	componentWillUnmount() {
		const {map} = this.map;
		if (!map) return;
		map.off("tileLayersChange", this.tileLayerChange);
		map.off("locateToggle", this.locateToggle);
	}

	componentDidUpdate(prevProps, prevState) {
		if (this._callback) this._callback();
		this._callback = undefined;

		if  (this.props.onOptionsChanged && ["tileLayers", "locate"].some(name => 
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

	showHelp = () => {
		this.setState({showHelp: true});
	}

	hideHelp = () => {
		this.setState({showHelp: false});
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
				{this.state.panel &&
					<MapPanel id={panel.id}
					          show={this.state.panel}
					          text={this.state.panelTextContent}
					          onClick={this.state.panelButtonOnClick}
					          buttonText={this.state.panelButtonContent}
					          buttonBsStyle={this.state.panelButtonBsStyle}
					/>
				}
				{this.state.showHelp &&
						<Modal dialogClassName="laji-form" show={true} onHide={this.hideHelp}>
							<Modal.Header closeButton={true} />
							<Modal.Body>
								<span dangerouslySetInnerHTML={{__html: mapOptions.help}} />
							</Modal.Body>
						</Modal>
					
				}
				<Map className={this.props.className}
				     style={this.props.style} 
				     ref="map" 
				     showHelp={this.showHelp}
				     hideHelp={this.hideHelp}
				     {...{...mapOptions, ...this.state.mapOptions}}
				/>
			</div>
		);
	}
}

export class Map extends React.Component {
	static defaultProps = {
		tileLayerName: "maastokartta",
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
			this.map.map.getContainer().focus();
			this.origBodyAsDialogRoot = this.map._dialogRoot === document.body;
			this.map.setOption("bodyAsDialogRoot", false);
			this.props.clickBeforeZoomAndPan && this.map.setOption("clickBeforeZoomAndPan", false);
			this._bodyOverflowYWas = document.body.style.overflowY;
			document.body.style.overflowY = "hidden";
		} else if (!this.state.fullscreen && prevState.fullscreen) {
			this.map.setRootElem(this._mapContainer);
			this.map.setOption("bodyAsDialogRoot", this.origBodyAsDialogRoot);
			this.props.clickBeforeZoomAndPan && this.map.setOption("clickBeforeZoomAndPan", true);
			document.body.style.overflowY = this._bodyOverflowYWas;
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
		const {fullscreenable, help, formContext = {}} = props;

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
		}
		if (help) {
			mapOptions.customControls = [
				...(mapOptions.customControls || []),
				{
					iconCls: "glyphicon glyphicon-question-sign",
					fn: this.props.showHelp,
					position: "bottomright",
					text: formContext.translations.Instructions
				}
			];
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

	onFullscreenKeyDown = (e) => {
		if (e.key === "Escape") {
			this.setState({fullscreen: false});
		}
	}

	render() {
		return (
			<React.Fragment>
				<div key="map"
					className={"laji-form-map" + (this.props.className ? " " + this.props.className : "")}
					style={this.props.style} ref="map" />
					{this.state.fullscreen && <Fullscreen ref={this.setFullscreenRef} on={this.state.fullscreen} onKeyDown={this.onFullscreenKeyDown} contextId={this.props.formContext.contextId} />}
		 </React.Fragment>
		);
	}
}

class MapPanel extends React.Component {
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

const saneOpacityRange = (opacity) => Math.min(1, Math.max(0, opacity || 0));

export const getFeatureStyleWithLowerOpacity = style => (
	{
		...style,
		opacity: saneOpacityRange(style.opacity || 1 - 0.5),
		fillOpacity: saneOpacityRange(style.fillOpacity || 0.4 - 0.3)
	}
);

export const getFeatureStyleWithHighlight = style => {
	const color = style.color
		? combineColors(style.color, "#ffffff", 30)
		: undefined;
	return {...style, color, fillOpacity: saneOpacityRange(style.fillOpacity || 0.4 + 0.4)};
};
