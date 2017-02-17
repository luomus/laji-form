import React, { Component, PropTypes } from "react";
import { findDOMNode } from "react-dom";
import update from "react-addons-update";
import deepEquals from "deep-equal";
import LajiMap from "laji-map";
import { NORMAL_COLOR } from "laji-map/lib/globals";
import { Row, Col, Panel, Popover } from "react-bootstrap";
import { Button, StretchAffix, Alert } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, immutableDelete, getTabbableFields, getSchemaElementById } from "../../utils";
import { shouldRender, getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";

const popupMappers = {
	unitTaxon: (schema, formData) => {
		try {
			return {[schema.identifications.items.properties.taxon.title]: formData.identifications[0].taxon}
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
				} else {
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
				geometryMapper: PropTypes.oneOf(["units"]),
				topOffset: PropTypes.integer,
				bottomOffset: PropTypes.integer,
				popupFields: PropTypes.arrayOf(PropTypes.object),
				mapSizes: PropTypes.shape({
					lg: PropTypes.integer,
					md: PropTypes.integer,
					sm: PropTypes.integer,
					xs: PropTypes.integer
				})
			})
		})
	}

	constructor(props) {
		super(props);
		this._context = new Context("MAP_UNITS");
		this._context.featureIdxsToItemIdxs = {};

		const initialState = {activeIdx: 0};
		new Context().addStateClearListener(() => {
			this.setState(initialState)
		});
		this.state = initialState;
	}

	componentDidMount() {
		this.setState({mounted: true});
	}

	componentWillUnmount() {
		this.setState({mounted: false});
	}

	componentDidUpdate() {
		const {geometryMapper} = getUiOptions(this.props.uiSchema);
		if (!geometryMapper) return;
		const mapper = this.geometryMappers[geometryMapper];
		if (mapper.onComponentDidUpdate) mapper.onComponentDidUpdate();
	}

	render() {
		const {formData, registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema, errorSchema} = this.props;
		const options = getUiOptions(this.props.uiSchema);
		const {popupFields, geometryMapper, geometryField, topOffset, bottomOffset} = options;
		const {activeIdx} = this.state;
		uiSchema = {
			...getInnerUiSchema(uiSchema),
			"ui:options": {
				...getUiOptions(getInnerUiSchema(uiSchema)),
				activeIdx,
				onActiveChange: (idx, callback) => {this.setState({activeIdx: idx}, callback)}
			}
		};

		const item = formData ? formData[activeIdx] : undefined;

		let defaultGeometries = [];
		if (activeIdx !== undefined && item && item[geometryField] && item[geometryField].type) {
			defaultGeometries = parseGeometries(item[geometryField]);
		}

		const mapper = geometryMapper ? this.geometryMappers[geometryMapper] : undefined;

		const geometries = (mapper ?
				mapper.getData() : defaultGeometries)
			|| [];

		const colTypes = ["lg", "md", "sm", "xs"];
		const mapSizes = options.mapSizes ?
			options.mapSizes :
			colTypes.reduce((sizes, size) => {
				sizes[size] = 6;
				return sizes;
			}, {});

		const schemaSizes = colTypes.reduce((sizes, size) => {
			sizes[size] = 12 - mapSizes[size];
			return sizes
		}, {});

		const schemaProps = immutableDelete(this.props.schema.items.properties, geometryField);
		const schema = {...this.props.schema, items: {...this.props.schema.items, properties: schemaProps}};

		const emptyMode = !formData || !formData.length;

		const drawOptions = options.draw === false ? false : {
			data: {
				featureCollection: {
					type: "FeatureCollection",
					features: (geometries || []).map(geometry => {
						return {type: "Feature", properties: {}, geometry}
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
				return {color: "#25B4CA", opacity: 1}
			},
			onChange: emptyMode ? this.onMapChangeCreateGathering : this.onMapChange,
			...(options.draw && options.draw.constructor === Object && options.draw !== null ? options.draw : {})
		};

		const errors = (errorSchema && errorSchema[activeIdx] && errorSchema[activeIdx][geometryField]) ?
			errorSchema[activeIdx][geometryField].__errors : null;

		return (
			<div ref="affix">
				<Row >
					<Col {...mapSizes}>
						<StretchAffix topOffset={topOffset}
									        bottomOffset={bottomOffset}
						              getContainer={() => findDOMNode(this.refs.affix)}
						              onResize={() => this.refs.map.map.map.invalidateSize()}
						              mounted={this.state.mounted}
						              className={this.state.focusGrabbed ? "pass-block" : ""}>
							<MapComponent
								ref="map"
								lang={this.props.formContext.lang}
								draw={drawOptions}
								onPopupClose={() => {this.setState({popupIdx: undefined})}}
								markerPopupOffset={45}
								featurePopupOffset={5}
								popupOnHover={true}
							  onFocusGrab={() => {this.setState({focusGrabbed: true})}}
								onFocusRelease={() => {this.setState({focusGrabbed: false})}}
							  controlSettings={(emptyMode || this.state.activeIdx !== undefined) ? {} : {draw: false, coordinateInput: false}}
							  panel={errors ? {header: this.props.formContext.translations.Error, panelTextContent: errors, bsStyle: "danger"} : null}
							/>
						</StretchAffix>
					</Col>
					<Col {...schemaSizes}>
						{emptyMode ?
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

	onMapChangeCreateGathering = (events) => {
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
					const node = getSchemaElementById(`${this.props.idSchema.$id}_0`);
					const tabbables = getTabbableFields(node);
					if (tabbables && tabbables.length) tabbables[0].focus();
				});
			}
		})
	}

	onMapChange = (events) => {
		const {geometryMapper} = getUiOptions(this.props.uiSchema);
		const mapper = geometryMapper ? this.geometryMappers[geometryMapper] : undefined;

		events.forEach(e => {
			switch (e.type) {
				case "create":
					(mapper && mapper.onAdd) ? mapper.onAdd(e) : this.onAdd(e);
					break;
				case "delete":
					(mapper && mapper.onRemove) ? mapper.onRemove(e) : this.onRemove(e);
					break;
				case "edit":
					(mapper && mapper.onEdited) ? mapper.onEdited(e) : this.onEdited(e);
					break;
			}
		});
	}

	onAdd = ({feature: {geometry}}) => {
		const formData = this.props.formData ||
			[getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)];
		const {geometryField} = getUiOptions(this.props.uiSchema);

		const itemFormData = formData[this.state.activeIdx];
		this.props.onChange(update(formData,
			{[this.state.activeIdx]: {$merge: {[geometryField]: {type: "GeometryCollection", geometries: [
				...parseGeometries(itemFormData[geometryField]), geometry
			]}}}}));
	}

	onRemove = ({idxs}) => {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		let splices = [];
		idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		const item = this.props.formData[this.state.activeIdx];
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {[geometryField]: item && item.type === "GeometryCollection" ?
				{geometries: {$splice: splices}} : {$set: undefined}}}));
	}

	onEdited = ({features}) => {
		const {geometryField} = getUiOptions(this.props.uiSchema);
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {[geometryField]: {
				geometries: Object.keys(features).reduce((obj, idx) => {
					obj[idx] = {$set: features[idx].geometry};
					return obj;
				}, {})
			}}}));
	}

	geometryMappers = {
		units: {
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

				let newGeometries = [];
				const units = (item && item.units) ? item.units : [];
				units.forEach((unit, i) => {
					const {unitGathering: {geometry}} = unit;
					if (geometry && hasData(geometry)) {
						this._context.featureIdxsToItemIdxs[geometries.length + newGeometries.length] = i;
						newGeometries.push(geometry);
					}
				});
				return [...geometries, ...newGeometries];
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
				const geometriesLength = formData[this.state.activeIdx][geometryField].geometries.length;

				const unitEditFeatures = {};
				const thisEditFeatures = {};
				Object.keys(features).forEach(idx => {
					(idx >= geometriesLength ? unitEditFeatures : thisEditFeatures)[idx] = features[idx];
				});

				const updateObject = {
					[this.state.activeIdx]: {
						units: Object.keys(unitEditFeatures).reduce((obj, idx) => {
							obj[this._context.featureIdxsToItemIdxs[idx]] = {unitGathering: {geometry: {$set: features[idx].geometry}}};
							return obj;
						}, {})
					}
				};

				this.props.onChange(update(this.props.formData,
					updateObject
				));

				this.onEdited({features: thisEditFeatures});
			},
			getIdSuffix: (idx) => `units_${idx}`,
			onComponentDidUpdate: () => {
				if (this.highlightedElem) {
					this.highlightedElem.className = this.highlightedElem.className.replace(" map-highlight", "");
				}

				const {popupIdx} = this.state;
				if (popupIdx === undefined) return;
				const {geometryMapper} = getUiOptions(this.props.uiSchema);
				const mapper = this.geometryMappers[geometryMapper];

				const idx = this._context.featureIdxsToItemIdxs[popupIdx];

				if (idx === undefined) {
					return;
				}

				const id = `_laji-form_${this.props.idSchema.$id}_${this.state.activeIdx}_${mapper.getIdSuffix(idx)}`;
				this.highlightedElem = document.querySelector(`#${id} .form-group`);

				if (this.highlightedElem) {
					this.highlightedElem.className += " map-highlight"
				}
			}
		}
	}


	getPopup = (idx, openPopupCallback) => {
		if (!this.refs.popup) return;
		this.setState({popupIdx: idx}, () => {
			if (this.refs.popup && hasData(this.getFeaturePopupData(idx))) openPopupCallback(this.refs.popup.refs.popup)
		});
	}

	getFeaturePopupData = (idx) => {
		const {popupFields, geometryMapper} = getUiOptions(this.props.uiSchema);
		const {formData} = this.props;

		const featureIdxToItemIdxs = this._context.featureIdxsToItemIdxs;
		const itemIdx = featureIdxToItemIdxs ? featureIdxToItemIdxs[idx] : undefined;
		let data = {};
		if (!formData || this.state.activeIdx === undefined || !formData[this.state.activeIdx] ||
		    !formData[this.state.activeIdx][geometryMapper] || itemIdx === undefined) return data;
		popupFields.forEach(field => {
			const fieldName = field.field;
			const itemFormData = formData[this.state.activeIdx][geometryMapper][itemIdx];
			let fieldSchema = this.props.schema.items.properties[geometryMapper].items.properties;
			let fieldData  = itemFormData ? itemFormData[fieldName] : undefined;
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
		this.state = this.getStateFromProps(props);
		this._context = new Context("MAP");
		this._context.grabFocus = this.grabFocus;
		this._context.releaseFocus = this.releaseFocus;
		this._context.showPanel = this.showPanel;
		this._context.hidePanel = this.hidePanel;
		this._context.setOnChange = this.setOnChange;
	}

	componentDidMount() {
		this.map = new LajiMap({
			...this.props,
			rootElem: this.refs.map
		});
		this._context.map = this.map;
	}

	getStateFromProps = ({draw: {data: {featureCollection}}, controlSettings}) => {
		return {featureCollection, controlSettings}
	}

	componentWillReceiveProps(props) {
		const {draw: {data, onChange}, controlSettings, lang} = props;
		const onDrawChange = this.state.onChange || onChange;
		if (this.map) {
			if (!deepEquals(data.featureCollection, this.state.featureCollection))  {
				this.map.setDrawData(data);
			}

			if (controlSettings && !deepEquals(controlSettings, this.state.controlSettings)) {
				this.map.setControlSettings(controlSettings);
			}
			if (lang !== this.props.lang) this.map.setLang(lang);
			if (onDrawChange !== this.map.onChange) {
				this.map.setOnDrawChange(onDrawChange);
			}
		}
		this.setState(this.getStateFromProps(props));
	}

	grabFocus = () => {
		const mainContext = new Context();
		mainContext.pushBlockingLoader();
		this.setState({focusGrabbed: true}, () => {
			if (this.props.onFocusGrab) this.props.onFocusGrab();
		});
	}

	releaseFocus = () => {
		const mainContext = new Context();
		mainContext.popBlockingLoader();
		this.setState({focusGrabbed: false}, () => {
			if (this.props.onFocusRelease) this.props.onFocusRelease();
		});
	}

	showPanel = (panelTextContent, panelButtonContent, onPanelButtonClick) => {
		this.setState({panel: true, panelTextContent, panelButtonContent, onPanelButtonClick});
	}

	hidePanel = () => {
		this.setState({panel: false});
	}

	setOnChange = (onChange) => {
		this.setState({onChange});
	}

	render() {
		const controlledPanel = this.props.panel ?
			<MapPanel bsStyle={this.props.panel.bsStyle || undefined}
			          header={this.props.panel.header}
								text={this.props.panel.panelTextContent} />
			: null;

		return (
			<div className={"laji-form-map-container" + (this.state.focusGrabbed ? " pass-block" : "")}>
				{controlledPanel}
				{this.state.panel ? <MapPanel show={this.state.panel}
									text={this.state.panelTextContent}
									onClick={this.state.onPanelButtonClick}
									buttonText={this.state.panelButtonContent} /> : null}
				<div key="map"
						 className={"laji-form-map" + (this.props.className ? " " + this.props.className : "")}
		         style={this.props.style} ref="map" />
			</div>
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
						<Button bsStyle="default" onClick={this.props.onClick}>{this.props.buttonText}</Button> :
						null
					}
				</Panel>
			</div>
		);
	}
}
