import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import update from "immutability-helper";
import deepEquals from "deep-equal";
import LajiMap from "laji-map";
import { latLngSegmentsToGeoJSONGeometry } from "laji-map/lib/utils";
import { NORMAL_COLOR } from "laji-map/lib/globals";
import { Row, Col, Panel, Popover } from "react-bootstrap";
import { Button, StretchAffix } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, immutableDelete, getTabbableFields, getSchemaElementById, getBootstrapCols, focusById, isNullOrUndefined } from "../../utils";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";

const popupMappers = {
	unitTaxon: (schema, formData) => {
		try {
			return {[schema.identifications.items.properties.taxon.title]: formData.identifications[0].taxon};
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

@BaseComponent
export default class MapArrayField extends Component {
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
		this._context = new Context(`${props.formContext.contextId}_MAP_UNITS`);
		this._context.featureIdxsToItemIdxs = {};

		const initialState = {activeIdx: 0};
		const options = getUiOptions(props.uiSchema);
		if ("activeIdx" in options) initialState.activeIdx = options.activeIdx;
		this.getContext().addStateClearListener(() => {
			this.setState(initialState);
		});
		this.state = initialState;
	}

	componentDidMount() {
		this.setState({mounted: true});
		const {onComponentDidMount} = this.getGeometryMapper(this.props);
		if (onComponentDidMount) onComponentDidMount();
	}

	componentWillUnmount() {
		this.setState({mounted: false});
	}

	componentDidUpdate(...params) {
		const mapper = this.getGeometryMapper(this.props);
		if (mapper.onComponentDidUpdate) mapper.onComponentDidUpdate(...params);
	}

	getGeometryMapper = (props) => {
		return this.geometryMappers[getUiOptions(props.uiSchema).geometryMapper || "default"];
	}

	render() {
		const {registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema, errorSchema} = this.props;
		const options = getUiOptions(this.props.uiSchema);
		const {popupFields, geometryField, topOffset, bottomOffset} = options;
		const {activeIdx} = this.state;
		uiSchema = {
			...getInnerUiSchema(uiSchema),
			"ui:options": {
				...getUiOptions(getInnerUiSchema(uiSchema)),
				activeIdx,
				onActiveChange: (idx, callback) => {
					this.setState({activeIdx: idx}, () => {
						this.getGeometryMapper(this.props).onActiveChange(idx);
						if (callback) callback();
					});
				}
			}
		};

		const mapOptions = {...this.getGeometryMapper(this.props).getOptions(options), ...options.mapOptions, ...(this.state.mapOptions || {})};

		const mapSizes = options.mapSizes || getBootstrapCols(6);

		const schemaSizes = ["lg", "md", "sm", "xs"].reduce((sizes, size) => {
			sizes[size] = 12 - mapSizes[size];
			return sizes;
		}, {});

		const schemaProps = immutableDelete(this.props.schema.items.properties, geometryField);
		const schema = {...this.props.schema, items: {...this.props.schema.items, properties: schemaProps}};

		const errors = (errorSchema && errorSchema[activeIdx] && errorSchema[activeIdx][geometryField]) ?
			errorSchema[activeIdx][geometryField].__errors : null;

		const getContainer = () => findDOMNode(this.refs.affix);
		const onResize = () => this.refs.map.map.map.invalidateSize({debounceMoveend: true});
		const onPopupClose = () => {this.setState({popupIdx: undefined});};
		const onFocusGrab = () => {this.setState({focusGrabbed: true});};
		const onFocusRelease = () => {this.setState({focusGrabbed: false});};

		return (
			<div ref="affix">
				<Row >
					<Col {...mapSizes}>
						<StretchAffix topOffset={topOffset}
									        bottomOffset={bottomOffset}
						              getContainer={getContainer}
						              onResize={onResize}
						              mounted={this.state.mounted}
						              className={this.state.focusGrabbed ? "pass-block" : ""}>
							<MapComponent
								ref="map"
								contextId={this.props.formContext.contextId}
								lang={this.props.formContext.lang}
								onPopupClose={onPopupClose}
								markerPopupOffset={45}
								featurePopupOffset={5}
								popupOnHover={true}
								onFocusGrab={onFocusGrab}
								onFocusRelease={onFocusRelease}
								panel={errors ? {header: this.props.formContext.translations.Error, panelTextContent: errors, bsStyle: "danger"} : null}
								draw={false}
								{...mapOptions}
							/>
						</StretchAffix>
					</Col>
					<Col {...schemaSizes}>
						{mapOptions.emptyMode ?
							<Popover placement="right" id={`${this.props.idSchema.$id}-help`}>{this.props.uiSchema["ui:help"]}</Popover> :
							<SchemaField {...this.props} schema={schema} uiSchema={uiSchema}/>
						}
					</Col>
				</Row>
				{popupFields ?
					<div style={{display: "none"}}>
						<Popup data={this.getFeaturePopupData(this.state.popupIdx)} ref="popup"/>
					</div> : null}
			</div>
		);
	}

	//TODO geometrymappers abuse each others criss and cross. All the other mappers should extend default mapper.
	geometryMappers = {
		default: {
			getOptions: (options) => {
				const mapper = this.geometryMappers.default;
				const {formData} = this.props;
				const geometries = mapper.getData();

				const emptyMode = !formData || !formData.length;

				const draw = options.draw === false ? false : {
					data: {
						featureCollection: {
							type: "FeatureCollection",
							features: (geometries || []).map(geometry => {
								return {type: "Feature", properties: {}, geometry};
							})
						}
					},
					getDraftStyle: () => {
						return {color: "#25B4CA", opacity: 1};
					},
					onChange: emptyMode ? mapper.onMapChangeCreateGathering : mapper.onChange,
					...(options.draw && options.draw.constructor === Object && options.draw !== null ? options.draw : {})
				};


				const controlSettings = (emptyMode || this.state.activeIdx !== undefined) ?
					{} : {draw: false, coordinateInput: false};

				return {draw, controlSettings, emptyMode};
			},
			onMapChangeCreateGathering: (events) => this.geometryMappers.units.onMapChangeCreateGathering(events),
			getData: () => {
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
			},
			onChange: (events) => {
				const mapper = this.geometryMappers.default;

				events.forEach(e => {
					switch (e.type) {
					case "create":
						mapper.onAdd(e);
						break;
					case "delete":
						mapper.onRemove(e);
						break;
					case "edit":
						mapper.onEdited(e);
						break;
					}
				});
			},
			onAdd: ({feature: {geometry}}) => {
				const formData = this.props.formData ||
					[getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)];
				const {geometryField} = getUiOptions(this.props.uiSchema);

				const itemFormData = formData[this.state.activeIdx];
				this.props.onChange(update(formData,
					{[this.state.activeIdx]: {$merge: {[geometryField]: {type: "GeometryCollection", geometries: [
						...parseGeometries(itemFormData[geometryField]), geometry
					]}}}}));
			},
			onRemove: ({idxs}) => {
				const {geometryField} = getUiOptions(this.props.uiSchema);
				let splices = [];
				idxs.sort().reverse().forEach((idx) => {
					splices.push([idx, 1]);
				});
				const item = this.props.formData[this.state.activeIdx];
				this.props.onChange(update(this.props.formData,
					{[this.state.activeIdx]: {[geometryField]: item && item.type === "GeometryCollection" ?
						{geometries: {$splice: splices}} : {$set: undefined}}}));
			},
			onEdited: ({features}) => {
				const {geometryField} = getUiOptions(this.props.uiSchema);
				this.props.onChange(update(this.props.formData,
					{[this.state.activeIdx]: {[geometryField]: {
						geometries: Object.keys(features).reduce((obj, idx) => {
							obj[idx] = {$set: features[idx].geometry};
							return obj;
						}, {})
					}}}));
			}
		},
		units: {
			field: "units",
			getOptions: (options) => {
				const mapper = this.geometryMappers.units;
				const {formData} = this.props;
				const geometries = mapper.getData();

				const emptyMode = !formData || !formData.length;

				const draw = options.draw === false ? false : {
					data: {
						featureCollection: {
							type: "FeatureCollection",
							features: (geometries || []).map(geometry => {
								return {type: "Feature", properties: {}, geometry};
							})
						},
						getPopup: this.getPopup,
						getFeatureStyle: ({featureIdx}) => {
							this._context.featureIdxsToItemIdxs[featureIdx];
							const color = this._context.featureIdxsToItemIdxs[featureIdx] === undefined ? NORMAL_COLOR : "#55AEFA";
							return {color: color, fillColor: color, weight: 4};
						}
					},
					getDraftStyle: () => {
						return {color: "#25B4CA", opacity: 1};
					},
					onChange: emptyMode ? mapper.onMapChangeCreateGathering : mapper.onChange,
					...(options.draw && options.draw.constructor === Object && options.draw !== null ? options.draw : {})
				};

				const controlSettings = (emptyMode || !isNullOrUndefined(this.state.activeIdx)) ?
					{} : {draw: false, coordinateInput: false};

				return {draw, controlSettings, emptyMode};
			},
			getData: () => {
				const {formData} = this.props;
				const idx = this.state.activeIdx;
				if (!formData) return;

				const item = formData[idx];

				const geometries = this.geometryMappers.default.getData();

				let newGeometries = [];
				const units = (item && item.units) ? item.units : [];
				units.forEach((unit, i) => {
					if (unit.unitGathering) {
						const {unitGathering: {geometry}} = unit;
						if (geometry && hasData(geometry)) {
							this._context.featureIdxsToItemIdxs[geometries.length + newGeometries.length] = i;
							newGeometries.push(geometry);
						}
					}
				});
				return [...geometries, ...newGeometries];
			},
			onChange: (events) => {
				const mapper = this.geometryMappers.units;

				events.forEach(e => {
					switch (e.type) {
					case "create":
						mapper.onAdd(e);
						break;
					case "delete":
						mapper.onRemove(e);
						break;
					case "edit":
						mapper.onEdited(e);
						break;
					}
				});
			},
			onMapChangeCreateGathering: (events) => {
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
			},
			onAdd: ({feature: {geometry}}) => {
				const formData = this.props.formData ||
					[getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)];
				const {geometryField} = getUiOptions(this.props.uiSchema);

				const itemFormData = formData[this.state.activeIdx];
				this.props.onChange(update(formData,
					{[this.state.activeIdx]: {$merge: {[geometryField]: {type: "GeometryCollection", geometries: [
						...parseGeometries(itemFormData[geometryField]), geometry
					]}}}}));
			},
			onRemove: ({idxs}) => {
				const {geometryField} = getUiOptions(this.props.uiSchema);
				const {formData} = this.props;
				const geometry = formData[this.state.activeIdx][geometryField];
				const geometriesLength = (geometry.type !== "GeometryCollection" && geometry.type) ? 1 : geometry.geometries.length;

				const unitIdxs = idxs.filter(idx => idx >= geometriesLength).map(idx => this._context.featureIdxsToItemIdxs[idx]);

				let splices = [];
				idxs.filter(idx => idx < geometriesLength).sort().reverse().forEach((idx) => {
					splices.push([idx, 1]);
				});

				const item = this.props.formData[this.state.activeIdx];
				let updateObject = {[this.state.activeIdx]: {
					[geometryField]: item && item[geometryField] && item[geometryField].type === "GeometryCollection" ?
						{geometries: {$splice: splices}} : {$set: undefined},
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

				this.props.onChange(update(formData,
					updateObject
				));
			},
			onEdited: ({features}) => {
				const {geometryField} = getUiOptions(this.props.uiSchema);
				const {formData} = this.props;
				const geometries = parseGeometries(formData[this.state.activeIdx][geometryField]);
				const geometriesLength = geometries.length;

				const unitEditGeometries = {};
				const thisEditGeometries = {};
				Object.keys(features).forEach(idx => {
					(idx >= geometriesLength ? unitEditGeometries : thisEditGeometries)[idx] = features[idx].geometry;
				});

				const updateObject = {
					[this.state.activeIdx]: {
						[geometryField]: {$set: {
							type: "GeometryCollection",
							geometries: geometries.map((geometry, i) => thisEditGeometries[i] ? thisEditGeometries[i] : geometries[i])}
						},
						units: Object.keys(unitEditGeometries).reduce((o, i) => {
							o[this._context.featureIdxsToItemIdxs[i]] = {unitGathering: {geometry: {$set: unitEditGeometries[i]}}};
							return o;
						}, {})
					}
				};

				this.props.onChange(update(this.props.formData, updateObject));
			},
			onComponentDidUpdate: () => {
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
			},
			onActiveChange: idx => {
				if (idx === undefined) return;
				const {map} = new Context(`${this.props.formContext.contextId}_MAP`);
				if (Object.keys(map.drawLayerGroup._layers).length) map.map.fitBounds(map.drawLayerGroup.getBounds());
			},
		},
		lineTransect: {
			getOptions: () => {
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
					controlSettings: {
						lineTransect: true

					}
				};
			},
			onActiveChange: idx => {
				const {map} = new Context(`${this.props.formContext.contextId}_MAP`);
				map.map.fitBounds(map._allCorridors[idx].getBounds(), {maxZoom: 13});
				map._openTooltipFor(idx);
				focusById(this.props.formContext.contextId, `${this.props.idSchema.$id}_${idx}`);
			},
			onComponentDidUpdate: (prevProps, prevState) => {
				if (prevState.activeIdx !== this.state.activeIdx) {
					this.geometryMappers.lineTransect.onActiveChange(this.state.activeIdx);
				}
			},
			onComponentDidMount: () => {
				this.geometryMappers.lineTransect.onActiveChange(this.state.activeIdx);
			}
		}
	}


	getPopup = (idx, feature, openPopupCallback) => {
		if (!this.refs.popup) return;
		this.setState({popupIdx: idx}, () => {
			this.refs.popup && hasData(this.getFeaturePopupData(idx)) && openPopupCallback(this.refs.popup.refs.popup);
		});
	}

	getFeaturePopupData = (idx) => {
		const {popupFields} = getUiOptions(this.props.uiSchema);
		const geometryMapperField = this.getGeometryMapper(this.props).field;
		const {formData} = this.props;

		if (!geometryMapperField) return false;

		const featureIdxToItemIdxs = this._context.featureIdxsToItemIdxs;
		const itemIdx = featureIdxToItemIdxs ? featureIdxToItemIdxs[idx] : undefined;
		let data = {};
		if (!formData || this.state.activeIdx === undefined || !formData[this.state.activeIdx] ||
		    !formData[this.state.activeIdx][geometryMapperField] || itemIdx === undefined) return data;
		popupFields.forEach(field => {
			const fieldName = field.field;
			const itemFormData = formData[this.state.activeIdx][geometryMapperField][itemIdx];
			let fieldSchema = this.props.schema.items.properties[geometryMapperField].items.properties;
			let fieldData = itemFormData ? itemFormData[fieldName] : undefined;
			if (field.mapper) {
				const mappedData = popupMappers[field.mapper](fieldSchema, itemFormData);
				for (let label in mappedData) {
					const item = mappedData[label];
					if (hasData(item)) data[label] = item;
				}
			} else if (fieldData) {
				const title = fieldSchema[fieldName].title || fieldName;
				data[title] = fieldData;
			}
		});
		return data;
	}
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
	}

	componentDidUpdate() {
		if (this._callback) this._callback();
		this._callback = undefined;

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

class Map extends Component {
	componentDidMount() {
		const {className, style, ...options} = this.props; // eslint-disable-line no-unused-vars
		this.map = new LajiMap({
			rootElem: this.refs.map,
			...options
		});
	}

	componentDidUpdate(prevProps) {
		function filterFunctions(original) {
			if (typeof original === "function" || typeof original !== "object" || Array.isArray(original) || original === null) return undefined;
			return Object.keys(original).reduce((filtered, key) => {
				// We don't check for object type recursively, because we know that only these objects contain functions.
				if (key === "draw" || key === "data" || key === "lineTransect") {
					filtered[key] = filterFunctions(original[key]);
				} else if (typeof original[key] !== "function") {
					filtered[key] = original[key];
				}

				return filtered;
			}, {});
		}

		const {className, style, ...options} = this.props; // eslint-disable-line no-unused-vars
		const {className: prevClassName, style: prevStyle, ...prevOptions} = prevProps; // eslint-disable-line no-unused-vars

		if (options.lineTransect && "activeIdx" in options.lineTransect) {
			this.map.setLTActiveIdx(options.lineTransect.activeIdx);
		}
		options.lineTransect = undefined;

		Object.keys(options).forEach(key => {
			if (!deepEquals(...[options, prevOptions].map(_options => _options[key]).map(filterFunctions))) {
				if (options[key] !== prevOptions[key]) {
					this.map.setOption(key, options[key]);
				}
			}
		});
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
			<div className="pass-block">
				<Panel bsStyle={this.props.bsStyle || undefined} header={this.props.header}>
					<div>{this.props.text}</div>
					{this.props.buttonText ?
						<Button bsStyle={this.props.buttonBsStyle || "default"} onClick={this.props.onClick}>{this.props.buttonText}</Button> :
						null
					}
				</Panel>
			</div>
		);
	}
}
