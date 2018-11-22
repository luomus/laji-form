import React, { Component } from "react";
import PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { Modal, Tooltip, Popover } from "react-bootstrap";
import update from "immutability-helper";
import { Alert } from "react-bootstrap";
import { GlyphButton, OverlayTrigger } from "../components";
import Context from "../../Context";
import { hasData, getUiOptions, getInnerUiSchema } from "../../utils";
import { Map } from "./MapArrayField";
import { combineColors } from "laji-map/lib/utils";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";

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

	getDrawFeatureStyle = () => ({color: "#55AEFA"})

	getDataFeatureStyle = () => ({color: "#aaaaaa", opacity: 0.7})

	onClick = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		if (!map) return;

		const geometryField = this.getGeometryField();

		const idx = this.getIdx();

		this.triggerLayer = undefined;

		const {rootElem, customControls, ...mapOptions} = map.getOptions(); // eslint-disable-line no-unused-vars
		const gatheringData = map.getDraw();

		const [unitGeometriesData, ...unitGeometryCollectionsData] = map.data.filter(i => i) || [];

		const data = [
			{
				featureCollection: gatheringData.featureCollection,
				getFeatureStyle: this.getDataFeatureStyle
			},
			{
				featureCollection: {
					type: "FeatureCollection",
					features: unitGeometriesData.featureCollection.features.filter(feature => feature.properties.idx !== idx)
				},
				getFeatureStyle: this.getDataFeatureStyle
			},
			...unitGeometryCollectionsData.map(data => ({
				featureCollection: {
					type: "FeatureCollection",
					features: data.featureCollection.features.filter(feature => feature.properties.idx !== idx)
				},
				getFeatureStyle: this.getDataFeatureStyle
			}))
		];

		const drawData = that.props.formData[geometryField] && that.props.formData[geometryField].type
			? { featureCollection: {type: "FeatureCollection", features: [{type: "Feature", geometry: that.props.formData[geometryField]}]} }
			: undefined;

		if (unitGeometriesData && drawData) drawData.getFeatureStyle = unitGeometriesData.getFeatureStyle;

		const {
			mapOptions: {
				marker = true,
				polyline = false,
				rectangle = false,
				polygon = false,
				circle = false
			} = {}
		} = getUiOptions(that.props.uiSchema);

		this.setState({
			modalMap: {
				...mapOptions,
				data,
				draw: {
					...drawData,
					getFeatureStyle: this.getDrawFeatureStyle,
					marker,
					polyline,
					rectangle,
					polygon,
					circle,
					onChange: this.onChange
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
				zoomToData: drawData ? {draw: true} : true,
				onComponentDidMount: this.onMapMounted
			}
		});
	}

	getGrey = () => ({opacity: 0.6, color: "#888888"})
	getFeatureStyle = () => ({color: "#75CEFA"})

	onChange = (events) => {
		const {that} = this.props;

		const {maxShapes = 1} = getUiOptions(that.props.uiSchema);

		const _that = this;
		function close() {
			_that.triggerLayer && _that.triggerLayer.disable();
			_that.onHide();
		}

		const geometryField = this.getGeometryField();
		for (let event of events) {
			const {type} = event;
			const geometryRef = that.props.formData[geometryField];

			switch (type) {
			case "create": {
				if (geometryRef.type && maxShapes > 1) {
					if (geometryRef.geometries && geometryRef.geometries.length >= maxShapes) {
						this.setState({shapeAlert: {label: "tooManyShapes", max: maxShapes}});
						return;
					}
					const geometries = geometryRef && geometryRef.geometries
						? geometryRef.geometries
						: geometryRef && geometryRef.type
						? [geometryRef]
						: [];
					that.props.onChange(update(
						that.props.formData,
						{[geometryField]: {$set: [...geometries, event.feature.geometry]}}
					));	
				} else {
					that.props.onChange(update(
						that.props.formData,
						{[geometryField]: {$set: event.feature.geometry}}
					));
				}
				// TODO LajiMap doesn't send a sequence of events containing multiple events if 
				// it sends a create event, but this isn't necessarily true in the future and
				// closing here wouldn't be right.
				if (maxShapes === 1) close();
				break;
			}
			case "delete": {
				if (!geometryRef || !geometryRef.type) {
					break;
				}
				const updateObject = geometryRef.type === "GeometryCollection" && geometryRef.geometries
					? {geometries: {$splice: [[event.idxs[0], 1]]}}
					: {$set: getDefaultFormState(that.props.schema.properties[geometryField], undefined, that.props.registry.definitions)};
				that.props.onChange(update(
					that.props.formData,
					{[geometryField]: updateObject}
				));
				break;
			}
			case "edit": {
				if (!geometryRef || !geometryRef.type) {
					break;
				}
				if (geometryRef.type === "GeometryCollection" && geometryRef.geometries) {
					const splices = Object.keys(event.features).reduce((splices, idx) => {
						idx = +idx;
						const geometry = event.features[idx].geometry;
						splices.push([idx, 1, geometry]);
						return splices;
					}, []);
					that.props.onChange(update(
						that.props.formData,
						{[geometryField]: {geometries: {$splice: splices}}}
					));
				} else if (geometryRef.type) {
					that.props.onChange(update(
						that.props.formData,
						{[geometryField]: {$set: event.features[0].geometry}}
					));
				}
			}
			}
			if ((geometryRef.geometries
				&& geometryRef.geometries.length <= maxShapes
				&& type !== "edit")) {
				this.setState({shapeAlert: undefined});
			}
		}
	}

	onMapMounted = (map) => {
		const {that} = this.props;
		const {preselectMarker = true} = getUiOptions(that.props.uiSchema);
		if (preselectMarker) {
			this.triggerLayer = map.triggerDrawing("marker");
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

		const data = [
			...(map && map.getDraw() ? [{
				...map.getDraw(),
				getFeatureStyle: this.getGrey
			}] : []),
			...(map && map.data && map.data[0] ? [{
				...map.data[0],
				getFeatureStyle: this.getGrey
			}] : []),
			{
				geoData: geometry,
				getFeatureStyle: this.getFeatureStyle
			}
		];

		const zoomToData = {dataIdxs: [data.length - 1]};
		this.setState({
			miniMap: {
				...mapOptions,
				draw: false,
				controls: false,
				customControls: undefined,
				zoomToData,
				data,
				clickBeforeZoomAndPan: false
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

	setMiniMapRef = (elem) => {
		this.miniMapRef = elem;
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
				<Map {...this.state.miniMap} hidden={!this.state.miniMap || this.state.modalMap} style={{width: 200, height: 200}} singleton={true} formContext={that.props.formContext} bodyAsDialogRoot={false} ref={this.setMiniMapRef}/>
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
					hoverable={true}
					_context={new Context(that.props.formContext.contextId)}
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
