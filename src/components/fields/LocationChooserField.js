import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { Modal, Tooltip, Popover, Overlay } from "react-bootstrap";
import update from "immutability-helper";
import { Alert } from "react-bootstrap";
import { GlyphButton, OverlayTrigger } from "../components";
import Context from "../../Context";
import { getUiOptions, getInnerUiSchema, formatErrorMessage } from "../../utils";
import { Map, parseGeometries } from "./MapArrayField";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { combineColors } from "laji-map/lib/utils";

@BaseComponent
export default class LocationChooserField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				uiSchema: PropTypes.object,
				taxonField: PropTypes.string,
				geometryField: PropTypes.string,
				strategy: PropTypes.string,
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
				...(uiSchema["ui:buttons"] || []),
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
		return parseGeometries(that.props.formData[geometryField]).length;
	}

	onMouseEnter = () => {
		const {that} = this.props;
		const idx = this.getIdx();
		this._hovered = true;
		if (typeof idx === "number") {
			new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "startHighlight", idx);
		}
	}

	onMouseLeave = () => {
		const {that} = this.props;
		const idx = this.getIdx();
		this._hovered = false;
		if (typeof idx === "number") {
			new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "endHighlight", idx);
		}
	}

	getUnitDrawFeatureStyle = () => ({color: "#55AEFA"})

	getDataFeatureStyle = () => ({color: "#aaaaaa", opacity: 0.7})

	getData = () => {
		const {that} = this.props;
		const {strategy = "unit"} = getUiOptions(that.props.uiSchema);

		switch (strategy) {
		case "unit": return this.getUnitData();
		case "lolife": return this.getLolifeData();
		}
	}

	getUnitData = () => {
		const {that} = this.props;
		const {formData} = that.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		const geometryField = this.getGeometryField();
		const emptyFeatureCollection = {featureCollection: {type: "FeatureCollection", features: []}};

		const gatheringData = map ? map.getDraw() : emptyFeatureCollection;

		const [unitGeometriesData, ...unitGeometryCollectionsData] = map
			? map.data.filter(i => i) || [emptyFeatureCollection]
			: [emptyFeatureCollection]; 

		const idx = this.getIdx();

		const draw = formData[geometryField] && formData[geometryField].type
			? {
				featureCollection: {type: "FeatureCollection", features: [{type: "Feature", geometry: formData[geometryField]}]},
				getFeatureStyle: this.getUnitDrawFeatureStyle,
			}
			: undefined;

		if (unitGeometriesData && draw) draw.getFeatureStyle = unitGeometriesData.getFeatureStyle;

		return [
			draw,
			[
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
			]
		];
	}

	getLolifeData = () => {
		const {that} = this.props;
		const {formData} = that.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		const geometryField = this.getGeometryField();


		const idx = this.getIdx();

		const draw = formData[geometryField] && formData[geometryField].type
				? {featureCollection: {type: "FeatureCollection", features: [{type: "Feature", geometry: formData[geometryField]}]}}
				: undefined;

		if (draw && map.data[idx + 1]) {
			draw.getFeatureStyle = map.data[idx + 1].getFeatureStyle;
		}

		return [
			draw,
			map.data.filter(({featureCollection}) =>
				featureCollection.features[0]
				&& (isNaN(idx)
					? featureCollection.features[0].properties.hasOwnProperty("idx")
					: featureCollection.features[0].properties.idx !== idx)
			).map(item => ({...item, getPopup: undefined, on: undefined}))
		];
	}

	onClick = () => {
		const {that} = this.props;
		const {disabled, readonly} = that.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;

		this.triggerLayer = undefined;

		let [draw, data] = this.getData();
		data = data.map(d => ({...d, editable: false}));

		const {rootElem, customControls, zoom, center, ...mapOptions} = map ? map.getOptions() : {mapOptions: {}}; // eslint-disable-line no-unused-vars

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
					...draw,
					marker,
					polyline,
					rectangle,
					polygon,
					circle,
					onChange: this.onChange,
					editable: !readonly && !disabled,
				},
				controls: {
					...mapOptions.controls,
					draw: {
						...((mapOptions.controls || {}).draw || {}),
						clear: false,
						delete: false
					}
				},
				fullscreenable: true,
				center,
				zoom,
				zoomToData: draw ? {draw: true} : true,
				clickBeforeZoomAndPan: false,
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
				if (geometryRef.type && (maxShapes > 1 || maxShapes === -1)) {
					if (geometryRef.geometries && maxShapes !== -1 && geometryRef.geometries.length >= maxShapes) {
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
		const {disabled, readonly} = that.props; 
		const {preselectMarker = true} = getUiOptions(that.props.uiSchema);
		map.resetDrawUndoStack();
		if (!disabled && !readonly && preselectMarker) {
			this.triggerLayer = map.triggerDrawing("marker");
		}
	}

	getMiniMapData = () => {
		const {that} = this.props;
		const {strategy = "unit"} = getUiOptions(that.props.uiSchema);

		switch (strategy) {
		case "unit": return this.getUnitMiniMapData();
		case "lolife": return this.getLolifeMiniMapData();
		}
	}


	getUnitMiniMapData = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
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
		return [
			data,
			{dataIdxs: [data.length - 1]}
		];
	}

	getLolifeMiniMapData = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		const idx = this.getIdx();
		return [
			map.data.map((item, i) => ({
				...item,
				getPopup: undefined,
				on: undefined,
				editable: false,
				getFeatureStyle: item.getFeatureStyle
					? (isNaN(idx) && i === 0) || i === idx + 1
						? this.getFeatureStyleWithHighlight(item.getFeatureStyle)
						: this.getFeatureStyleWithLowerOpacity(item.getFeatureStyle)
					: undefined
			})),
			{dataIdxs: [isNaN(idx) ? 0 : idx + 1]}
		];
	}

	getFeatureStyleWithLowerOpacity = getFeatureStyle => (...params) => {
		const style = getFeatureStyle(...params);
		return {...style, opacity: 0.5, fillOpacity: 0.5};
	}

	getFeatureStyleWithHighlight = getFeatureStyle => (...params) => {
		const style = getFeatureStyle(...params);
		return {...style, color: combineColors(style.color, "#ffffff", 30)};
	}

	onEntered = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		if (!mapContext) {
			return;
		}

		const {map} = mapContext;
		let mapOptions = {};
		if (map) {
			const {rootElem, zoom, center, ..._mapOptions} = map.getOptions(); //eslint-disable-line no-unused-vars
			mapOptions = _mapOptions;
		}

		const [data, zoomToData] = this.getMiniMapData();

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
	}

	onHide = () => {
		this.setState({modalMap: undefined});
	}

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

	setButtonRef = (elem) => {
		this.buttonRef = elem;
	}
	getButtonElem = () => findDOMNode(this.buttonRef)

	renderButton = () => {
		const {that, glyph = "map-marker", label} = this.props;
		const id = that.props.idSchema.$id;
		const {color} = getUiOptions(that.props.uiSchema);

		const hasCoordinates = this.hasCoordinates();
		const geometryField = this.getGeometryField();
		const hasErrors = that.props.errorSchema[geometryField];

		const bsStyle = hasErrors
			? "danger"
			: hasCoordinates
				? "primary"
				: "default"; 

		const button = <LocationButtonComp
				key={`${that.props.idSchema.$id}-location`}
				id={`${that.props.idSchema.$id}-location`}
				variant={bsStyle}
				onMouseEnter={this.onMouseEnter}
				onMouseLeave={this.onMouseLeave}
				glyph={glyph}
				onClick={this.onClick}
				style={hasCoordinates && !hasErrors && color ? {backgroundColor: color} : undefined}
				ref={this.setButtonRef}
			/>;

		if (hasErrors) {
			return (
				<React.Fragment>
					{button}
					<Overlay show={true} container={this} target={this.getButtonElem} placement="left">
						<Tooltip id={`laji-form-error-container-${id}_${geometryField}`} className="location-chooser-errors">
							<ul>{hasErrors.__errors.map((e, i) => <li key={i}>{formatErrorMessage(e)}</li>)}</ul>
						</Tooltip>
					</Overlay>
				</React.Fragment>
			);
		} else {
			const {translations} = that.props.formContext;
			const overlay = hasCoordinates ? (
				<Popover id={`${id}-location-peeker`} title={`${translations.SetLocation} (${translations.below} ${translations.currentLocation})`}>
					<Map {...this.state.miniMap}
						hidden={!this.state.miniMap || this.state.modalMap}
						style={{width: 200, height: 200}}
						singleton={true}
						formContext={that.props.formContext}
						bodyAsDialogRoot={false}
						ref={this.setMiniMapRef} />
				</Popover>
			) : (
				<Tooltip id={`${id}-location-peeker`}>{label || that.props.formContext.translations.ChooseLocation}</Tooltip>
			);

			return (
				<OverlayTrigger key={`${id}-set-coordinates-${glyph}`} 
					overlay={overlay}
					placement="left"
					hoverable={true}
					_context={new Context(that.props.formContext.contextId)}
					onEntered={hasCoordinates ? this.onEntered : undefined}>
					{button}
				</OverlayTrigger>
			);
		}
	}

	render () {
		const {that} = this.props;
		const {shapeAlert} = this.state;
		const {taxonField, title} = getUiOptions(that.props.uiSchema);

		const {translations} = that.props.formContext;

		return (
			<React.Fragment>
				{this.renderButton()}
				{this.state.modalMap &&
						<Modal key="map-modal" show={true} dialogClassName="laji-form map-dialog" onHide={this.onHide} keyboard={false} onKeyDown={this.onModalMapKeyDown}>
							<Modal.Header closeButton={true}>
								<Modal.Title>{title || translations.SetLocationToUnit(that.props.formData[taxonField])}</Modal.Title>
							</Modal.Header>
							<Modal.Body>
								{shapeAlert && <Alert variant="danger">{translations[shapeAlert.label] + shapeAlert.max}</Alert>}
								<Map {...this.state.modalMap} singleton={true} formContext={that.props.formContext} ref={this.setMapRef} bodyAsDialogRoot={false} />
							</Modal.Body>
						</Modal>
				}
			</React.Fragment>
		);
	}
}

class LocationButtonComp extends Component {
	render() {
		return (
			<GlyphButton {...this.props} />
		);
	}
}
