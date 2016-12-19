import React, { Component, PropTypes } from "react";
import { findDOMNode } from "react-dom";
import update from "react-addons-update";
import deepEquals from "deep-equal";
import LajiMap, { NORMAL_COLOR } from "laji-map";
import { Row, Col, Panel, Popover } from "react-bootstrap";
import { Button, Affix } from "../components";
import { getUiOptions, getInnerUiSchema, hasData, parseDotPath } from "../../utils";
import { shouldRender, getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import Context from "../../Context";

const popupMappers = {
	unitTaxon: (schema, formData) => {
		try {
			return {[schema.identifications.items.properties.taxon.title]: formData.identifications[0].taxon}
		} catch (e) {
			return {};
		}
	}
};

export default class AltMapArrayField extends Component {
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

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	componentDidUpdate() {
		const {geometryMapper} = getUiOptions(this.props.uiSchema);
		if (!geometryMapper) return;
		const mapper = this.geometryMappers[geometryMapper];
		if (mapper.onComponentDidUpdate) mapper.onComponentDidUpdate();
	}

	render() {
		const {formData, registry: {fields: {SchemaField}}} = this.props;
		let {uiSchema} = this.props;
		const options = getUiOptions(this.props.uiSchema);
		const {popupFields, geometryMapper, topOffset} = options;
		uiSchema = {
			...getInnerUiSchema(uiSchema),
			"ui:options": {
				...getUiOptions(getInnerUiSchema(uiSchema)),
				activeIdx: this.state.activeIdx,
				onActiveChange: idx => {this.setState({activeIdx: idx})}
			}
		};

		const geometries = this.geometryMappers[geometryMapper].getData(this.state.activeIdx, formData);

		const colTypes = ["lg", "md", "sm", "xs"];
		const mapSizes = options.mapSizes ?
			options.mapSizes :
			colTypes.reduce((sizes, size) => {
				sizes[size] = 6;
				return sizes
			}, {});

		const schemaSizes = colTypes.reduce((sizes, size) => {
			sizes[size] = 12 - mapSizes[size];
			return sizes
		}, {});

		const {geometry, ...schemaProps} = this.props.schema.items.properties;
		const schema = {...this.props.schema, items: {...this.props.schema.items, properties: schemaProps}};

		const emptyMode = !formData || !formData.length;

		return (
			<div>
				<Row ref={elem => {this.affix = elem;}}>
					<Col {...mapSizes}>
						<Affix container={this}
						       offset={topOffset}
						       getContainer={() => findDOMNode(this.affix)} className={this.state.focusGrabbed ? "pass-block" : ""}>
							<MapComponent
								ref="map"
								lang={this.props.formContext.lang}
								drawData={{
									featureCollection: {
										type: "featureCollection",
										features: (geometries || []).map(geometry => {return {type: "Feature", properties: {}, geometry}})
									},
									getPopup: this.getPopup,
									getFeatureStyle: ({featureIdx}) => {
										const color = this._context.featureIdxsToItemIdxs[featureIdx] === undefined ? NORMAL_COLOR : "#55AEFA";
										return {color: color, fillColor: color, weight: 4};
									}
								}}
								getDrawingDraftStyle={() => {
									return {color: "#25B4CA", opacity: 1}
								}}
								onPopupClose={() => {this.setState({popupIdx: undefined})}}
								onChange={emptyMode ? this.onMapChangeCreateGathering : this.onMapChange}
								markerPopupOffset={45}
								featurePopupOffset={5}
								popupOnHover={true}
							  onFocusGrab={() => {this.setState({focusGrabbed: true})}}
								onFocusRelease={() => {this.setState({focusGrabbed: false})}}
							  controlSettings={(emptyMode || this.state.activeIdx !== undefined) ? {} : {draw: false}}
							/>
						</Affix>
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
		events.forEach(e => {
			if (e.type === "create") {
				const formData = getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions);
				formData.geometry = {
					type: "GeometryCollection",
					geometries: [e.feature.geometry]
				};
				this.props.onChange([formData]);
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

		const itemFormData = formData[this.state.activeIdx];
		let updateObject = undefined;
		if (itemFormData && itemFormData.geometry && itemFormData.geometry.geometries) {
			updateObject = {geometry: {
				geometries: {$push: [geometry]}
			}};
		} else {
			updateObject = {$merge: {geometry: {type: "GeometryCollection", geometries: [geometry]}}};
		}
		this.props.onChange(update(formData,
			{[this.state.activeIdx]: updateObject}));
	}


	onRemove = ({idxs}) => {
		let splices = [];
		idxs.sort().reverse().forEach((idx) => {
			splices.push([idx, 1]);
		});
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {geometry: {geometries: {$splice: splices}}}}));
	}

	onEdited = ({features}) => {
		this.props.onChange(update(this.props.formData,
			{[this.state.activeIdx]: {geometry: {
				geometries: Object.keys(features).reduce((obj, idx) => {
					obj[idx] = {$set: features[idx].geometry};
					return obj;
				}, {})
			}}}));
	}

	geometryMappers = {
		units: {
			getData: (idx, formData) => {
				if (!formData) return;
				const item = formData[idx];
				this._context.featureIdxsToItemIdxs = {};
				let geometries = (idx !== undefined && item && item.geometry &&
				                  item.geometry.geometries) ?
					item.geometry.geometries : [];
				const units = (item && item.units) ? item.units : [];
				units.forEach((unit, i) => {
					const {unitGathering: {geometry}} = unit;
					if (geometry && hasData(geometry)) {
						this._context.featureIdxsToItemIdxs[geometries.length] = i;
						geometries = [...geometries, geometry];
					}
				});
				return geometries;
			},
			onRemove: ({idxs}) => {
				const {formData} = this.props;
				const geometriesLength = formData[this.state.activeIdx].geometry.geometries.length;

				const unitIdxs = idxs.filter(idx => idx >= geometriesLength).map(idx => this._context.featureIdxsToItemIdxs[idx]);

				const updateObject = {
					[this.state.activeIdx]: {
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
					}
				};
				this.props.onChange(update(formData,
					updateObject
				));

				this.onRemove({idxs: idxs.filter(idx => idx < geometriesLength)});
			},
			onEdited: ({features}) => {
				const {formData} = this.props;
				const geometriesLength = formData[this.state.activeIdx].geometry.geometries.length;

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
		if (!formData || this.state.activeIdx === undefined ||
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
				const title = fieldSchema[fieldName] || fieldName;
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
		window.addEventListener("resize", this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.onResize);
	}

	getStateFromProps = ({drawData, controlSettings}) => {
		return {featureCollection: drawData.featureCollection, controlSettings}
	}

	componentWillReceiveProps(props) {
		const {drawData, activeIdx, controlSettings, lang} = props;
		const onChange = this.state.onChange || props.onChange;
		if (this.map) {
			if (!deepEquals(drawData.featureCollection, this.state.featureCollection))  {
				this.map.setDrawData(drawData);
			}
			this.map.setActive(this.map.idxsToIds[activeIdx]);

			if (controlSettings && !deepEquals(controlSettings, this.state.controlSettings)) this.map.setControlSettings(controlSettings);
			if (lang !== this.props.lang) this.map.setLang(lang);
			if (onChange !== this.map.onChange) {
				this.map.setOption("onChange", onChange);
			}
		}
		this.setState(this.getStateFromProps(props));
	}

	shouldComponentUpdate(nextProps, nextState) {
		return false;
	}

	componentDidUpdate() {
		this.onResize();
	}

	onResize = () => {
		this.map.map.invalidateSize();
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

	showPanel = (panelTextContent, panelButtonContent, onPanelButtonClick, callback) => {
		this.setState({panel: true, panelTextContent, panelButtonContent, onPanelButtonClick});
	}

	hidePanel = () => {
		this.setState({panel: false});
	}

	setOnChange = (onChange) => {
		this.setState({onChange});
	}

	render() {
		return (
			<div className={"laji-form-map-container" + (this.state.focusGrabbed ? " pass-block" : "")}>
				{this.state.panel ?
					<div className="pass-block" ref="panel">
						<Panel>
							<div>{this.state.panelTextContent}</div>
							<Button bsStyle="default" onClick={this.state.onPanelButtonClick}>{this.state.panelButtonContent}</Button>
						</Panel>
					</div> : null}
				<div key="map" className={"laji-form-map" + (this.props.className ? " " + this.props.className : "")}
		         style={this.props.style} ref="map" />
			</div>
		);
	}
}
