import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import update from "immutability-helper";
import deepEquals from "deep-equal";
import LajiMap from "laji-map/lib/map";
import { latLngSegmentsToGeoJSONGeometry } from "laji-map/lib/utils";
import { NORMAL_COLOR } from "laji-map/lib/globals";
import { Row, Col, Panel, Popover } from "react-bootstrap";
import { Button, StretchAffix, Stretch } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, immutableDelete, getTabbableFields, getSchemaElementById, getBootstrapCols, focusById, isNullOrUndefined, parseJSONPointer } from "../../utils";
import { getDefaultFormState, toIdSchema } from "react-jsonschema-form/lib/utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import { getPropsForFields } from "./NestField";

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
		const {onComponentDidMount} = this.getGeometryMapper(this.props);
		this.map = this.refs.map.refs.map.map;
		if (onComponentDidMount) onComponentDidMount();
	}

	componentWillUnmount() {
		this.setState({mounted: false});
		this.getContext().removeKeyHandler(`${this.props.idSchema.$id}`, this.mapKeyFunctions);
	}

	componentDidUpdate(...params) {
		const mapper = this.getGeometryMapper(this.props);
		if (mapper.onComponentDidUpdate) mapper.onComponentDidUpdate(...params);
		if (this.refs.stretch) {
			const {resizeTimeout} = getUiOptions(this.props.uiSchema);
			if (resizeTimeout) {
				this.getContext().setTimeout(this.refs.stretch.update, resizeTimeout);
			} else {
				this.refs.stretch.update();
			}
		}
	}

	getGeometryMapper = (props) => {
		return this.geometryMappers[getUiOptions(props.uiSchema).geometryMapper || "default"];
	}

	render() {
		const {registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema, errorSchema} = this.props;
		const options = getUiOptions(this.props.uiSchema);
		const {popupFields, geometryField, topOffset, bottomOffset, belowFields, propsToPassToInlineSchema = []} = options;
		let { belowUiSchemaRoot = {}, inlineUiSchemaRoot = {} } = options;
		const {activeIdx} = this.state;

		const activeIdxProps = {
			activeIdx,
			onActiveChange: (idx, callback) => {
				this.setState({activeIdx: idx}, () => {
					this.getGeometryMapper(this.props).onActiveChange(idx);
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

		const mapOptions = {...this.getGeometryMapper(this.props).getOptions(options), ...options.mapOptions, ...(this.state.mapOptions || {})};

		const mapSizes = options.mapSizes || getBootstrapCols(6);

		const schemaSizes = ["lg", "md", "sm", "xs"].reduce((sizes, size) => {
			sizes[size] = 12 - mapSizes[size] || 12;
			return sizes;
		}, {});

		const schemaProps = immutableDelete(this.props.schema.items.properties, geometryField);
		const schema = {...this.props.schema, items: {...this.props.schema.items, properties: schemaProps}};

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
			inlineUiSchema.items = {...(inlineUiSchemaRoot.items || {}), ...inlineItemsUiSchema};
		} else {
			inlineUiSchema.items = inlineItemsUiSchema;
		}

		let belowUiSchema =  belowSchemaProps ? {...belowSchemaProps.uiSchema, ...belowUiSchemaRoot} : undefined;

		inlineUiSchema = {...inlineUiSchema, "ui:options": {...(inlineUiSchema["ui:options"] || {}), ...activeIdxProps}};
		if (belowUiSchema) belowUiSchema = {...belowUiSchema, "ui:options": {...(belowUiSchema["ui:options"] || {}), ...activeIdxProps}};

		const {addButtonPath, removeAddButtonPath} = getUiOptions(this.props.uiSchema);
		if (addButtonPath) {
			const injectTarget = parseJSONPointer(belowUiSchema, `${addButtonPath}/ui:options`, "createParents");
			const buttons = uiSchema["ui:options"].buttons || [];
			const injectButtons = injectTarget.buttons || [];
			if ((injectButtons).every(button => {return button.key !== "_add";})) {
				injectTarget.buttons = [
					...injectButtons, 
					{
						...(buttons.find(button => button.fn === "add") || {}),
						fn: () => () => {
							const nextActive = this.props.formData.length;
							this.props.onChange([...this.props.formData, getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)]);
							this.setState({activeIdx: nextActive}, () => focusById(this.props.formContext.contextId ,`${this.props.idSchema.$id}_${this.state.activeIdx}`));
						}, 
						key: "_add",
						glyph: "plus"
					}
				];
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

		const errors = (errorSchema && errorSchema[activeIdx] && errorSchema[activeIdx][geometryField]) ?
			errorSchema[activeIdx][geometryField].__errors : null;

		const getContainer = () => findDOMNode(belowSchema ? this.refs._stretch : this.refs.affix);
		const onResize = () => this.refs.map.map.map.invalidateSize({debounceMoveend: true});
		const onPopupClose = () => {this.setState({popupIdx: undefined});};
		const onFocusGrab = () => {this.setState({focusGrabbed: true});};
		const onFocusRelease = () => {this.setState({focusGrabbed: false});};
		const onOptionsChanged = options => {
			this.setState({mapOptions: {...this.state.mapOptions, ...options}});
		};
		const getAligmentAnchor = () => this.refs._stretch;

		const mapPropsToPass = {
			contextId: this.props.formContext.contextId,
			lang: this.props.formContext.lang,
			onPopupClose: onPopupClose,
			markerPopupOffset: 45,
			featurePopupOffset: 5,
			popupOnHover: true,
			onFocusGrab: onFocusGrab,
			onFocusRelease: onFocusRelease,
			panel: errors ? {
				header: this.props.formContext.translations.Error,
				panelTextContent: <div id={`laji-form-error-container-${this.props.idSchema.$id}_${activeIdx}_${geometryField}`}>{errors}</div>,
				bsStyle: "danger"
			} : null,
			draw: false,
			controlSettings: true,
			onOptionsChanged: onOptionsChanged,
			...mapOptions
		};
		const map = (
			<MapComponent
				ref="map"
				{...mapPropsToPass}
			/>
		);

		const wrapperProps = {
			getContainer,
			topOffset: topOffset === undefined ? this.props.formContext.topOffset : topOffset,
			bottomOffset: bottomOffset === undefined ? this.props.formContext.bottomOffset : bottomOffset,
			onResize,
			mounted: this.state.mounted,
			className: this.state.focusGrabbed ? "pass-block" : "",
			minHeight: getUiOptions(this.props.uiSchema).minHeight
		};

		const wrappedMap = belowSchema ? (
			<Stretch {...wrapperProps}  ref="stretch">
				{map}
			</Stretch>
		) : (
			<StretchAffix {...wrapperProps} getAligmentAnchor={getAligmentAnchor}>
				{map}
			</StretchAffix>
		);

		return (
			<div ref="affix">
				<Row>
					<Col {...mapSizes}>
						{wrappedMap}
					</Col>
					<Col {...schemaSizes} ref="_stretch">
						{mapOptions.emptyMode ?
							<Popover placement="right" id={`${this.props.idSchema.$id}-help`}>{this.props.uiSchema["ui:help"]}</Popover> :
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

	//TODO geometrymappers abuse each others criss and cross. All the other mappers should extend default mapper.
	geometryMappers = {
		default: {
			getOptions: (options) => {
				const mapper = this.geometryMappers.default;
				const {formData} = this.props;
				const geometries = mapper.getData();

				const emptyMode = !formData || !formData.length;

				const draw = (options.draw === false || (isNullOrUndefined(this.state.activeIdx) && !emptyMode)) ? false : {
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
					{drawCopy: true} : {draw: false, coordinateInput: false};

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

				const draw = (options.draw === false || (isNullOrUndefined(this.state.activeIdx) && !emptyMode)) ? false : {
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
					{drawCopy: true} : {draw: false, coordinateInput: false};

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
				if (Object.keys(this.map.drawLayerGroup._layers).length) this.map.map.fitBounds(this.map.drawLayerGroup.getBounds());
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
				this.getContext().setImmediate(() =>
					this.map.map.fitBounds(this.map._allCorridors[idx].getBounds(), {maxZoom: this.map._getDefaultCRSLayers().includes(this.map.tileLayer) ? 16 : 13})
				);
				this.map._openTooltipFor(idx);
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


	mapKeyFunctions = {
		splitLineTransectByMeters: () => {
			if (getUiOptions(this.props.uiSchema).geometryMapper !== "lineTransect") return false;
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
		function filterFunctions(original) {
			if (typeof original === "function") return undefined;
			else if (Array.isArray(original)) return original.map(filterFunctions);
			else if (typeof original !== "object" || original === null) return original;
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

		const {className, style, onComponentDidMount, hidden, singleton, ..._options} = options; // eslint-disable-line no-unused-vars
		const {
			className: prevClassName, // eslint-disable-line no-unused-vars
			style: prevStyle,  // eslint-disable-line no-unused-vars
			onComponentDidMount: prevOnComponentDidMount,  // eslint-disable-line no-unused-vars
			hidden: prevHidden,  // eslint-disable-line no-unused-vars
			singleton: prevSingleton,  // eslint-disable-line no-unused-vars
			..._prevOptions
		} = prevOptions; // eslint-disable-line no-unused-vars
	

		if (this.map) Object.keys(_options).forEach(key => {
			if (!deepEquals(...[_options, _prevOptions].map(__options => filterFunctions(__options)[key]))) {
				if (_options[key] !== _prevOptions[key]) {
					this.map.setOption(key, _options[key]);
				}
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
			<div className="pass-block">
				<Panel bsStyle={this.props.bsStyle || undefined} header={this.props.header}>
					{this.props.text}
					{this.props.buttonText ?
						<Button bsStyle={this.props.buttonBsStyle || "default"} onClick={this.props.onClick}>{this.props.buttonText}</Button> :
						null
					}
				</Panel>
			</div>
		);
	}
}
