import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { Modal, Tooltip, Popover, Overlay } from "react-bootstrap";
import { Alert } from "react-bootstrap";
import { GlyphButton, OverlayTrigger } from "../components";
import Context from "../../Context";
import { getUiOptions, getInnerUiSchema, formatErrorMessage, filteredErrors, parseJSONPointer, updateFormDataWithJSONPointer, parseSchemaFromFormDataPointer, JSONPointerToId, getUUID } from "../../utils";
import { Map, parseGeometries, getFeatureStyleWithHighlight, getFeatureStyleWithLowerOpacity } from "./MapArrayField";
import { getDefaultFormState } from "@rjsf/core/dist/cjs/utils";

@BaseComponent
export default class LocationChooserField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				uiSchema: PropTypes.object,
				taxonField: PropTypes.string,
				geometryField: PropTypes.string,
				strategy: PropTypes.oneOf(["unit", "lolife", "lolifeUnit"]),
				mapOptions: PropTypes.object,
				maxShapes: PropTypes.number,
				preselectMarker: PropTypes.bool,
				color: PropTypes.string
			})
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
		return parseGeometries(this.getGeometry()).length;
	}

	getGeometry = () => {
		const geometryField = this.getGeometryField();
		return parseJSONPointer(this.props.that.props.formData, geometryField);
	}

	onMouseEnter = () => {
		const {that} = this.props;
		const idx = this.getIdx();
		this._hovered = true;
		if (typeof idx === "number") {
			new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "startHighlight", {id: getUUID(that.props.formData), idx});
		}
	}

	onMouseLeave = () => {
		const {that} = this.props;
		const idx = this.getIdx();
		this._hovered = false;
		if (typeof idx === "number") {
			new Context(that.props.formContext.contextId).sendCustomEvent(that.props.idSchema.$id, "endHighlight", {id: getUUID(that.props.formData), idx});
		}
	}

	getUnitDrawFeatureStyle = () => ({color: "#55AEFA"})

	getDataFeatureStyle = () => ({color: "#aaaaaa", opacity: 0.7})

	getData = () => {
		const {that} = this.props;
		const {strategy = "unit"} = getUiOptions(that.props.uiSchema);

		switch (strategy) {
		case "unit":
			return this.getUnitData();
		case "lolifeUnit":
		case "lolife":
			return this.getLolifeData();
		}
	}

	getUnitData = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		const emptyFeatureCollection = {featureCollection: {type: "FeatureCollection", features: []}};

		const gatheringData = map ? map.getDraw() : emptyFeatureCollection;

		const [unitGeometriesData, ...unitGeometryCollectionsData] = map
			? map.data.filter(i => i) || [emptyFeatureCollection]
			: [emptyFeatureCollection]; 

		const idx = this.getIdx();

		const geometry = this.getGeometry();
		const draw = geometry && geometry.type
			? {
				featureCollection: {type: "FeatureCollection", features: [{type: "Feature", geometry}]},
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
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		const {strategy = "unit"} = getUiOptions(that.props.uiSchema);

		let draw;
		if (strategy === "lolife") {
			draw = map.getDraw();
		}
		const id = getUUID(that.props.formData);
		let data = map.data.filter((item) => {
			const isCurrent = item.featureCollection.features[0].properties.id === id;
			if (strategy === "lolifeUnit" && isCurrent) {
				draw = {...item,
					idx: map.drawIdx,
					getPopup: undefined,
					on: undefined,
					getFeatureStyle: this.getFeatureStyleWithHighlight(item.getFeatureStyle),
					getDraftStyle: () => this.getFeatureStyleWithHighlight(item.getFeatureStyle)({feature: {properties: {id}}}, !!"higlight")
				};
			}
			return !isCurrent;
		}).map(item => ({...item, getPopup: undefined, on: undefined, getFeatureStyle: this.getFeatureStyleWithLowerOpacity(item.getFeatureStyle)}));

		if (strategy === "lolifeUnit") {
			data.push(map.getDraw());
		}

		return [
			draw,
			data
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

		const modalMap = {
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
			zoomToData: draw ? {draw: true} : true,
			clickBeforeZoomAndPan: false,
			onComponentDidMount: this.onMapMounted
		};

		if (center) {
			modalMap.center = center;
		}
		if (zoom) {
			modalMap.zoom = zoom;
		}

		this.setState({
			modalMap
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
			const geometryRef = parseJSONPointer(that.props.formData, geometryField);

			switch (type) {
			case "create": {
				if (geometryRef && geometryRef.type && (maxShapes > 1 || maxShapes === -1)) {
					if (geometryRef.geometries && maxShapes !== -1 && geometryRef.geometries.length >= maxShapes) {
						this.setState({shapeAlert: {label: "tooManyShapes", max: maxShapes}});
						return;
					}
					const geometries = geometryRef && geometryRef.geometries
						? geometryRef.geometries
						: geometryRef && geometryRef.type
							? [geometryRef]
							: [];
					that.props.onChange(updateFormDataWithJSONPointer(that.props, {type: "GeometryCollection", geometries: [...geometries, event.feature.geometry]}, geometryField));
				} else {
					that.props.onChange(updateFormDataWithJSONPointer(that.props, event.feature.geometry, geometryField));
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
				that.props.onChange(updateFormDataWithJSONPointer(that.props, getDefaultFormState(parseSchemaFromFormDataPointer(that.props.schema, geometryField), undefined, that.props.registry.definitions), geometryField));
				break;
			}
			case "edit": {
				if (!geometryRef || !geometryRef.type) {
					break;
				}
				if (geometryRef.type === "GeometryCollection" && geometryRef.geometries) {
					const geometry = Object.keys(event.features).reduce((geometry, idx) => {
						const feature = event.features[idx];
						geometry = {...geometry, geometries: {...geometry.geometries, [idx]: feature.geometry}};
						return geometry;
					}, parseJSONPointer(that.props.formData, geometryField));
					that.props.onChange(updateFormDataWithJSONPointer(that.props, geometry, geometryField));
				} else if (geometryRef.type) {
					that.props.onChange(updateFormDataWithJSONPointer(that.props, event.features[0].geometry, geometryField));
				}
			}
			}

			if (geometryRef
				&& geometryRef.geometries
				&& geometryRef.geometries.length <= maxShapes
				&& type !== "edit") {
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
		case "unit":
			return this.getUnitMiniMapData();
		case "lolifeUnit": 
			return this.getLolifeUnitMiniMapData();
		case "lolife": 
			return this.getLolifeMiniMapData();
		}
	}


	getUnitMiniMapData = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		const geometry = this.getGeometry();

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
		const draw = map.getDraw();
		return [
			[
				draw,
				...map.data.map((item) => {
					return {
						...item,
						getPopup: undefined,
						on: undefined,
						editable: false,
						getFeatureStyle: item.getFeatureStyle
					};
				})
			],
			{dataIdxs: [draw.idx || 0]}
		];
	}

	getLolifeUnitMiniMapData = () => {
		const {that} = this.props;
		const mapContext = new Context(`${that.props.formContext.contextId}_MAP`);
		const {map} = mapContext;
		const id = getUUID(that.props.formData);
		return [
			[
				...map.data.map((item) => (
					{
						...item,
						getPopup: undefined,
						on: undefined,
						editable: false,
						getFeatureStyle: item.getFeatureStyle
						? item.featureCollection.features[0].properties.id === id
							? this.getFeatureStyleWithHighlight(item.getFeatureStyle)
							: this.getFeatureStyleWithLowerOpacity(item.getFeatureStyle)
						: undefined
					}
				)),
				map.getDraw()
			],
			{dataIdxs: [map.data.findIndex(d => d.featureCollection.features[0].properties.id === id)]}
		];
	}

	getFeatureStyleWithLowerOpacity = getFeatureStyle => (...params) => {
		const style = getFeatureStyle(...params);
		return getFeatureStyleWithLowerOpacity(style);
	}

	getFeatureStyleWithHighlight = getFeatureStyle => (...params) => {
		const style = getFeatureStyle(...params);
		return getFeatureStyleWithHighlight(style);
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
		if (e.key === "Escape" && !this.modalMapRef.map.keyHandler(e.nativeEvent)) {
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
		const hasErrors = parseJSONPointer(filteredErrors(that.props.errorSchema), geometryField);

		const bsStyle = hasErrors
			? "danger"
			: hasCoordinates
				? "primary"
				: "default"; 

		const button = <LocationButtonComp
				key={`${that.props.idSchema.$id}-location`}
				id={`${that.props.idSchema.$id}-location`}
				bsStyle={bsStyle}
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
						<Tooltip id={`laji-form-error-container-${id}_${JSONPointerToId(geometryField)}`} className="location-chooser-errors">
							<ul>{hasErrors.__errors.map((e, i) => <li key={i}>{formatErrorMessage(e)}</li>)}</ul>
						</Tooltip>
					</Overlay>
				</React.Fragment>
			);
		} else {
			const {translations} = that.props.formContext;
			const overlay = hasCoordinates ? (
				<Popover id={`${id}-location-peeker`} title={`${translations.ChooseLocation} (${translations.below} ${translations.currentLocation})`}>
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
								{shapeAlert && <Alert bsStyle="danger">{translations[shapeAlert.label] + shapeAlert.max}</Alert>}
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
