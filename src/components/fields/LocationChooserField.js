import React, { Component } from "react";
import PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { Modal, OverlayTrigger, Tooltip, Popover } from "react-bootstrap";
import update from "immutability-helper";
import { Alert } from "react-bootstrap";
import { GlyphButton } from "../components";
import Context from "../../Context";
import { hasData, getUiOptions, getInnerUiSchema } from "../../utils";
import { Map } from "./MapArrayField";
import { combineColors } from "laji-map/lib/utils";

@BaseComponent
export default class LocationChooserField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				uiSchema: PropTypes.object,
				taxonField: PropTypes.string,
				geometryField: PropTypes.string,
				mapDrawOptions: PropTypes.shape({
					marker: PropTypes.bool,
					polyline: PropTypes.bool,
					rectangle: PropTypes.bool,
					polygon: PropTypes.bool,
					circle: PropTypes.bool,
				})
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}
	getStateFromProps(props) {
		let uiSchema = getInnerUiSchema(props.uiSchema);

		uiSchema = {
			...uiSchema,
			"ui:buttons": [
				(uiSchema["ui:buttons"] || []),
				<LocationButton key={`$${this.props.idSchema.$id}-location`} that={this} />
			]
		};

		return {uiSchema};
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return <SchemaField {...this.props} {...this.state} />;
	}
}

class LocationButton extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	getIdx = () => {
		const {that} = this.props;
		const {$id} = that.props.idSchema;
		const splitted = $id.split("_");
		return parseInt(splitted[splitted.length - 1]);
	}

	componentWillUnmount() {
		this._hovered && this.onMouseLeave();
	}

	getGeometryField = () => {
		const {that} = this.props;
		const {geometryField = "geometry"} = getUiOptions(that.props.uiSchema);
		return geometryField;
	}

	hasCoordinates = () => {
		const {that} = this.props;
		const geometryField = this.getGeometryField();
		return hasData(that.props.formData[geometryField]);
	}

	onMouseEnter = () => {
		const {that} = this.props;
		const idx = this.getIdx();
		this._hovered = true;
		if (typeof idx === "number" && !isNaN(idx)) {
			new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "startHighlightUnit", idx);
		}
	}

	onMouseLeave = () => {
		const {that} = this.props;
		const idx = this.getIdx();
		this._hovered = false;
		if (typeof idx === "number" && !isNaN(idx)) {
			new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "endHighlightUnit", idx);
		}
	}

	getUnitFeatureStyle = () => ({color: "#55AEFA"})

	getDrawFeatureStyle = () => ({color: combineColors("#55AEFA", "#00ff00", 70)})

	onClick = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		if (!map) return;

		const {translations} = that.props.formContext;
		const geometryField = this.getGeometryField();
		const hasCoordinates = this.hasCoordinates();

		const idx = this.getIdx();

		let modalMap = undefined;
		let triggerLayer = undefined;

		const {rootElem, customControls, ...mapOptions} = map.getOptions(); // eslint-disable-line no-unused-vars
		const gatheringData = map.getDraw();
		const unitData = map.data && map.data[0] ? 
			map.data[0] :
			undefined;

		const data = [
			{
				featureCollection: gatheringData.featureCollection,
				getFeatureStyle: gatheringData.getFeatureStyle
			},
		];

		if (unitData) {
			data.push({
				featureCollection: {
					features: unitData.featureCollection.features.filter(feature => feature.properties.idx !== idx)
				},
				getFeatureStyle: this.getUnitFeatureStyle
			});
		}

		const drawData = that.props.formData[geometryField] && that.props.formData[geometryField].type ? 
			{ featureCollection: {type: "FeatureCollection", features: [{type: "Feature", geometry: that.props.formData[geometryField]}]} }:
			undefined;

		if (unitData && drawData) drawData.getFeatureStyle = unitData.getFeatureStyle;

		const uiOptions = that.props.uiSchema["ui:options"];

		const _mapOptions = uiOptions.mapOptions || {};

		const marker = _mapOptions.hasOwnProperty("marker") ? _mapOptions.marker : true;
		const polyline = _mapOptions.hasOwnProperty("polyline") ? _mapOptions.polyline : false;
		const rectangle = _mapOptions.hasOwnProperty("rectangle") ? _mapOptions.rectangle : false;
		const polygon = _mapOptions.hasOwnProperty("polygon") ? _mapOptions.polygon : false;
		const circle = _mapOptions.hasOwnProperty("circle") ? _mapOptions.circle : false;

		let preselectMarker = true;

		if (uiOptions.hasOwnProperty("preselectMarker")) {
			preselectMarker = that.props.uiSchema["ui:options"].preselectMarker;
		}

		let maxShapes = 1;
		if (uiOptions.maxShapes) {
			maxShapes = uiOptions.maxShapes;
		}

		this.setState({
			modalMap: {
				...mapOptions,
				data,
				draw: {
					...mapOptions.draw,
					featureCollection: undefined,
					...drawData,
					getFeatureStyle: this.getDrawFeatureStyle,
					marker,
					polyline,
					rectangle,
					polygon,
					circle,
					onChange: events => {
						for (let event of events) {
							const {type} = event;
							const geometryRef = that.props.formData[geometryField];

							switch (type) {
							case "create":
								if (geometryRef.type && maxShapes > 1) {
									if (geometryRef.geometries.length >= maxShapes) {
										this.setState({shapeAlert: {label: "tooManyShapes", max: maxShapes}});
										return;
									}
									that.props.onChange(update(
										that.props.formData,
										{[geometryField]: {geometries: {$push: [{...event.feature.geometry}]}}}
									));	
								} else {
									that.props.onChange(update(
										that.props.formData,
										{$merge: {[geometryField]: {type: "GeometryCollection", geometries: [{...event.feature.geometry}]}}}
									));
								}
								if (maxShapes === 1) close();
								break;
							case "delete":
								that.props.onChange(update(
									that.props.formData,
									{[geometryField]: {geometries: {$splice: [[event.idxs[0], 1]]}}}	
								));
								break;
							case "edit":
								var index = Object.keys(event.features)[0];
								if (index < maxShapes) {
									that.props.onChange(update(
										that.props.formData,
										{[geometryField]: {geometries: {$splice: [[index, 1, event.features[index].geometry]]}}}
									));
								}
							}
							if ((geometryRef.geometries
								&& geometryRef.geometries.length <= maxShapes
								&& type !== "edit")) {
								this.setState({shapeAlert: undefined});
							}
						}
					},
				},
				controls: {
					...mapOptions.controls,
					draw: {
						...(mapOptions.controls.draw || {}),
						clear: false,
						delete: false
					}
				},
				fullscreenable: true,
				onComponentDidMount: (map) => {
					modalMap = map;
					if (!preselectMarker) {
						return;
					}
					triggerLayer = modalMap.triggerDrawing("marker");
					const layer = map._getLayerByIdxTuple([map.drawIdx, 0]);
					if (layer) {
						layer.bindTooltip(translations.CurrentLocation, {permanent: true}).openTooltip();
						modalMap.setLayerStyle(layer, {opacity: 0.7});
						map.map.setView(layer.getLatLng(), map.map.zoom, {animate: false});
					} else {
						const {group: drawLayerGroup} = modalMap.getDraw();
						const bounds = drawLayerGroup ? drawLayerGroup.getBounds() : undefined;
						if (bounds && bounds._southWest && bounds._northEast) modalMap.map.fitBounds(bounds);
					}
				},
				center: hasCoordinates ? that.props.formData[geometryField].geometries[0].coordinates.slice(0).reverse() : mapOptions.center,
				zoom: hasCoordinates ? 14 : mapOptions.zoom
			}
		});

		const _that = this;
		function close() {
			if (triggerLayer) triggerLayer.disable();
			_that.onHide();
		}
	}

	onEntered = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		if (!mapContext) return;

		const {map} = mapContext;
		let mapOptions = {};
		if (map) {
			const {rootElem, ..._mapOptions} = map.getOptions(); //eslint-disable-line no-unused-vars
			mapOptions = _mapOptions;
		}

		const geometryField = this.getGeometryField();
		const geometry = that.props.formData[geometryField];

		this.setState({
			miniMap: {
				...mapOptions,
				draw: false,
				controls: false,
				customControls: undefined,
				zoom: 8,
				center: geometry.geometries[0].coordinates.slice(0).reverse(),
				data: [
					...(map && map.getDraw() ? [{
						...map.getDraw(),
						getFeatureStyle: () => {return {opacity: 0.6, color: "#888888"};}
					}] : []),
					...(map && map.data && map.data[0] ? [{
						...map.data[0],
						getFeatureStyle: () => {return {opacity: 0.6, color: "#888888"};}
					}] : []),
					{
						geoData: geometry,
						getFeatureStyle: () => {return {color: "#75CEFA"};}
					}
				]
			}
		});
	};

	onHide = () => {
		this.setState({modalMap: undefined});
	};

	onModalMapKeyDown = (e) => {
		if (e.key === "Escape" && !this.modalMapRef.map.keyHandler(e)) {
			this.onHide();
		}
	}

	setMapRef = (elem) => {
		this.modalMapRef = elem;
	}

	render ()  {
		const {that, glyph = "map-marker", label} = this.props;
		const {shapeAlert} = this.state;
		const id = that.props.idSchema.$id;

		const hasCoordinates = this.hasCoordinates();

		const button = (
			<GlyphButton
				id={`${that.props.idSchema.$id}-location`}
				bsStyle={hasCoordinates ? "primary" : "default"}
				onMouseEnter={this.onMouseEnter}
				onMouseLeave={this.onMouseLeave}
				glyph={glyph}
				onClick={this.onClick} />
		);

		const {translations} = that.props.formContext;
		const overlay = hasCoordinates ? (
			<Popover id={`${id}-location-peeker`} title={`${translations.SetLocation} (${translations.below} ${translations.currentLocation})`}>
				<Map {...this.state.miniMap} hidden={!this.state.miniMap} style={{width: 200, height: 200}} singleton={true} formContext={that.props.formContext} bodyAsDialogRoot={false}/>
			</Popover>
		) : (
			<Tooltip id={`${id}-location-peeker`}>{label || that.props.formContext.translations.ChooseLocation}</Tooltip>
		);

		const {taxonField} = getUiOptions(that.props.uiSchema);
		return (
			<React.Fragment>
				<OverlayTrigger key={`${id}-set-coordinates-${glyph}`} 
					overlay={overlay}
					placement="left"
					onEntered={hasCoordinates ? this.onEntered : undefined}>
					{button}
				</OverlayTrigger>
				{this.state.modalMap &&
						<Modal key="map-modal" show={true} dialogClassName="laji-form map-dialog" onHide={this.onHide} keyboard={false} onKeyDown={this.onModalMapKeyDown}>
							<Modal.Header closeButton={true}>
								<Modal.Title>{translations.SetLocationToUnit(that.props.formData[taxonField])}</Modal.Title>
							</Modal.Header>
							<Modal.Body>
								{shapeAlert && <Alert bsStyle="danger">{translations[shapeAlert.label] + shapeAlert.max}</Alert>}
								<Map {...this.state.modalMap} singleton={true} formContext={that.props.formContext} ref={this.setMapRef} bodyAsDialogRoot={false} />
							</Modal.Body>
						</Modal>
				}
			</React.Fragment>
		);
	}
}
