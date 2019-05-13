import React, { Component } from "react";
import { createPortal, findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import { MapComponent } from "./MapArrayField";
import { Affix } from "../components";
import { getUiOptions, isObject } from "../../utils";
import BaseComponent from "../BaseComponent";
import ApiClient from "../../ApiClient";
import equals from "deep-equal";
import Context from "../../Context";
import Spinner from "react-spinner";
import { Button, Fullscreen } from "../components";
import { anyToFeatureCollection } from "laji-map/lib/utils";

export function findSingleGeometry(geoJSON) {
	if (!geoJSON) return undefined;
	switch (geoJSON.type) {
	case "FeatureCollection":
		return geoJSON.features.length === 1
			? findSingleGeometry(geoJSON.features[0])
			: undefined;
	case "GeometryCollection":
		return geoJSON.geometries.length === 1
			? findSingleGeometry(geoJSON.geometries[0])
			: undefined;
	case "Feature":
		return findSingleGeometry(geoJSON.geometry);
	case undefined:
		return undefined;
	default:
		return geoJSON && geoJSON.coordinates ? geoJSON : undefined;
	}
}

export function getCenterAndRadiusFromGeometry(geometry) {
	const singleGeometry = findSingleGeometry(geometry);
	if (!singleGeometry) {
		return {};
	}
	let center, radius;
	if (singleGeometry && singleGeometry.type === "Point") {
		center = singleGeometry.coordinates.slice(0).reverse();
		radius = singleGeometry.radius;
	} else {
		const bounds = new L.GeoJSON(anyToFeatureCollection(geometry)).getBounds();
		center = bounds.getCenter();
		radius = bounds.getSouthWest().distanceTo(bounds.getSouthEast()) / 2;
	}
	return {center, radius};
}

@BaseComponent
export default class MapField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				mapOptions: PropTypes.object,
				height: PropTypes.number,
				emptyHelp: PropTypes.string,
				geometryCollection: PropTypes.boolean,
			}).isRequired
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		const {uiSchema} = this.props;
		const {mapOptions = {}} = getUiOptions(uiSchema);
		if (mapOptions.singleton) {
			const map = this.getContext().singletonMap;
			if (map && map.getOptions().locate && map.userLocation) {
				this.onLocate(map.userLocation.latlng, map.userLocation.accuracy);
			}
		}
		this.geocode(this.props);

		new Context(this.props.formContext.contextId).addCustomEventListener(this.props.idSchema.$id, "locate", (geometry) => {
			if (geometry) {
				this.onLocate({lat: geometry.coordinates[1], lng: geometry.coordinates[0]}, 100, !!"force");
			} else if (!this.getGeometry(this.props)) {
				this.setState({locateOn: true});
			}
		});
	}

	componentWillUnmount() {
		new Context(this.props.formContext.contextId).removeCustomEventListener(this.props.idSchema.$id, "locate");
	}

	componentDidUpdate(prevProps) {
		this.geocode(prevProps);
		this.zoomIfExternalEdit(this.props);
		if (this._zoomToDataOnNextTick) {
			this.map.zoomToData();
			this._zoomToDataOnNextTick = undefined;
		}
	}

	geocode = (prevProps) => {
		let {area} = getUiOptions(this.props.uiSchema);
		if (area instanceof Array) {
			area = area[0];
		}
		const isEmptyAndWasEmpty = [this.props, prevProps].every(props => {
			const {geoData} = this.getDrawOptions(props);
			return !geoData
				|| (isObject(geoData) && Object.keys(geoData).length === 0)
				|| (geoData.type === "GeometryCollection" && geoData.geometries.length === 0)
				|| (geoData.type === "FeatureCollection" && geoData.features.length === 0);
		});
		if (isEmptyAndWasEmpty && area && area.length > 0) {
			new ApiClient().fetch(`/areas/${area}`, undefined, undefined).then((result)=>{
				this.map.geocode(result.name, undefined, 8);
			});
		}
	}

	zoomIfExternalEdit = (props) => {
		if (!equals(this._lastFormData, props.formData)) {
			this.map.zoomToData();
		}
	}

	setMapRef = (mapComponent) => {
		if (mapComponent && mapComponent.refs && mapComponent.refs.map) {
			this.map = mapComponent.refs.map.map;
			this.setState({mapRendered: true});
		}
	}

	showMobileEditorMap = () => {
		this.setState({mobileEditor: true});
	}

	render() {
		const {TitleField} = this.props.registry.fields;
		const {uiSchema, formData} = this.props;
		const {height = 400, emptyHelp, mapOptions = {}, mobileEditor: _mobileEditor} = getUiOptions(uiSchema);
		const isEmpty = !formData || !formData.geometries || !formData.geometries.length;
		const _mapOptions = {
			clickBeforeZoomAndPan: true,
			...mapOptions,
			...(this.state.mapOptions || {}),
			locate: {
				on: this.state.locateOn || false,
				onLocationFound: this.onLocate
			}
		};

		const isSingleton = _mapOptions.singleton;
		let singletonHasLocate = false;
		let singletonRendered = false;
		if (isSingleton) {
			const map = this.getContext().singletonMap;
			if (map) {
				singletonRendered = true;
				singletonHasLocate = map.getOptions().locate;
			}
		}

		if (mapOptions.createOnLocate && !this.state.mapOptions && (!singletonRendered || singletonHasLocate)) {
			_mapOptions.locate.on = true;
		}

		if (_mobileEditor) {
			_mapOptions.controls = false;
			_mapOptions.customControls = [{
				text: this.props.formContext.translations.SetLocation,
				fn: this.showMobileEditorMap,
				iconCls: "glyphicon glyphicon-pencil"
			}];
		}

		const {lang, topOffset, bottomOffset} = this.props.formContext;

		const {mobileEditor} = this.state;

		let mobileEditorOptions = isObject(mobileEditor) ? mobileEditor : {};
		const geometry = this.getGeometry(this.props);
		if (geometry) {
			const {center, radius} = getCenterAndRadiusFromGeometry(geometry);
			mobileEditorOptions = {
				center,
				radius
			};
		}

		if (this.map && this.map.userLocation) {
			mobileEditorOptions.userLocation = this.map.userLocation;
		}

		return (
			<div>
				<TitleField title={this.props.schema.title} />
					<Affix {...{topOffset, bottomOffset}}>
						<div style={{height}}>
							<MapComponent {..._mapOptions}
								ref={this.setMapRef}
								draw={this.getDrawOptions(this.props)}
								lang={lang}
								zoomToData={true}
								panel={emptyHelp && isEmpty ? {panelTextContent: emptyHelp} : undefined}
								formContext={this.props.formContext}
								onOptionsChanged={this.onOptionsChanged} />
								{this.renderBlocker()}
						</div>
					</Affix>
						{this.state.mapRendered && mobileEditor &&
								<MobileEditorMap {...mobileEditorOptions}
									onChange={this.onMobileEditorChange}
									onClose={this.onHideMobileEditorMap}
									map={this.map}
									formContext={this.props.formContext}
								/>
					}
			</div>
		);
	}

	getDrawOptions = (props) => {
		const {uiSchema, disabled, readonly} = props;
		const options = getUiOptions(uiSchema);
		const {mapOptions = {}, mobileEditor} = options;
		const drawOptions = {
			...(mapOptions.draw || {}),
			geoData: this.getGeometry(props),
			onChange: this.onChange,
			editable: !disabled && !readonly
		};
		if (mobileEditor) {
			drawOptions.getFeatureStyle = this.getEditWithModalFeatureStyle;
		}
		return drawOptions;
	}

	getEditWithModalFeatureStyle = () => ({
		fillOpacity: 0,
		color: "black",
		weight: "2",
	})

	getGeometry = (props) => {
		const {formData} = props;
		return formData && Object.keys(formData).length ? formData : undefined;
	}

	onOptionsChanged = (options) => {
		this.setState({mapOptions: {...this.state.mapOptions, ...options}});
	}

	onChange = (events) => {
		const {geometryCollection = true} = getUiOptions(this.props.uiSchema);
		let formData;
		events.forEach(e => {
			switch (e.type) {
			case "create":
				formData = geometryCollection ? {
					type: "GeometryCollection",
					geometries: [e.feature.geometry]
				} : e.feature.geometry;
				break;
			case "edit":
				formData = geometryCollection ? {
					type: "GeometryCollection",
					geometries: [e.features[0].geometry]
				} : e.features[0].geometry;
				break;
			case "delete":
				formData = geometryCollection ? {
					type: "GeometryCollection",
					geometries: []
				} : {};
			}
		});
		this._lastFormData = formData;
		this._zoomToDataOnNextTick = true;
		this.props.onChange(formData);
	}

	onMobileEditorChange = (point) => {
		const geometry = this.getGeometry(this.props);
		const feature = {
			type: "Feature",
			geometry: point
		};
		if (geometry) {
			this.onChange([{type: "edit", features: [feature]}]);
		} else {
			this.onChange([{type: "create", feature}]);
		}
	}

	onHideMobileEditorMap = () => {
		this.setState({mobileEditor: false});
	}

	onLocate = (latlng, radius, forceShow) => {
		const {geometryCollection = true, mobileEditor, createOnLocate} = getUiOptions(this.props.uiSchema);
		const isEmpty = !this.getGeometry(this.props);
		if (!latlng || !isEmpty) {
			this.located = true;
			return;
		}
		if (mobileEditor) {
			((!this.located || forceShow)) && this.setState({mobileEditor: {center: latlng, radius}});
			this.located = true;
			return;
		}
		this.located = true;
		if (createOnLocate) {
			const geometry = {type: "Point", coordinates: [latlng.lng, latlng.lat]};
			this.props.onChange(geometryCollection ? {type: "GeometryCollection", geometries: [geometry]} : geometry);
		}
	}

	renderBlocker() {
		const {blockBeforeLocation} = getUiOptions(this.props.uiSchema);
		const geometry = this.getGeometry(this.props);
		if (blockBeforeLocation && !this.located && !geometry) {
			return (
				<React.Fragment>
					<div className="blocker" />
					<div className="blocker-content">
							<span>{this.props.formContext.translations.SearchingForLocation}...</span>
							<Spinner />
					</div>
				</React.Fragment>
			);
		}
	}
}

class MobileEditorMap extends Component {
	DEFAULT_RADIUS_PIXELS = 100;

	constructor(props) {
		super(props);
		const {center, radius} = this.props;

		this.state = {mapOptions: this.setViewFromCenterAndRadius(center, radius)};
	}

	setMobileEditorMapRef = (mapComponent) => {
		if (mapComponent && mapComponent.refs && mapComponent.refs.map) {
			this.map = mapComponent.refs.map.map;
		}

		this.setState({mapRendered: true});
	}

	setOkButtonRef = (elem) => {
		this.okButtonElem = findDOMNode(elem);
	}

	componentDidMount() {
		this.okButtonElem.focus();
	}

	getCircle(radiusPixels) {
		return (
			<svg viewBox="0 0" width="100%" height="100%" style={{position: "absolute", zIndex: 1000, top: 0, pointerEvents: "none"}}>
				<defs>
					<mask id="mask" x="0" y="0" width="100%" height="100%">
						<rect x="0" y="0" width="100%" height="100%" fill="#fff"></rect>
						<circle cx="50%" cy="50%" r={radiusPixels}></circle>
					</mask>
				</defs>
				<rect x="0" y="0" width="100%" height="100%" mask="url(#mask)" fillOpacity="0.2"></rect>    
				<circle cx="50%" cy="50%" r={radiusPixels} stroke="black" strokeWidth="2" fillOpacity="0"></circle>
			</svg>
		);
	}

	onChange = () => {
		const {map} = this.map;
		const centerLatLng = map.getCenter();
		const centerPoint = map.latLngToContainerPoint(centerLatLng);
		const leftEdgeAsLatLng = map.containerPointToLatLng({x: centerPoint.x - this.DEFAULT_RADIUS_PIXELS, y: centerPoint.y});
		const radius = map.getCenter().distanceTo(leftEdgeAsLatLng);
		this.props.onChange({
			type: "Point",
			coordinates: [centerLatLng.lng, centerLatLng.lat],
			radius
		});
		this.props.onClose();
	}

	computePadding = () => {
		// If the rendered element wasn't full screen, we couldn't use these as height/width.
		const height = window.innerHeight;
		const width = window.innerWidth;
		const topToCircleEdgePixels = parseInt(height / 2 - this.DEFAULT_RADIUS_PIXELS);
		const leftToCircleEdgePixels = parseInt(width / 2 - this.DEFAULT_RADIUS_PIXELS);
		const padding = [
			leftToCircleEdgePixels,
			topToCircleEdgePixels
		];
		return padding;
	}

	setViewFromCenterAndRadius = (center, radius) => {
		if (center) {
			if (radius) {
				const centerLatLng = L.latLng(center);
				const data = {
					geoData: {
						type: "Point",
						coordinates: [centerLatLng.lng, centerLatLng.lat],
						radius
					},
					getFeatureStyle: this.invisibleStyle
				};
				const zoomToData = {
					padding: this.computePadding()
				};
				return {data, zoomToData};
			}
			return {center};
		}
		return {};
	}

	invisibleStyle = () => {
		return {
			opacity: 0,
			fillOpacity: 0
		};
	}

	onKeyDown = ({key}) => {
		if (key === "Escape") {
			this.props.onClose();
		}
	}

	onLocate = (latlng, accuracy) => {
		if (this.props.center) return;

		const options = this.setViewFromCenterAndRadius(latlng, accuracy);
		if (options.data && options.zoomToData) {
			this.setState({mapOptions: {data: options.data}}, () => {
				this.map.zoomToData(options.zoomToData);
			});
		} else if (options.center) {
			this.map.setCenter(options.center);
		}
	}

	render() {
		let {rootElem, customControls, draw, data, zoomToData, zoom, center, locate, ...options} = this.props.map.getOptions(); // eslint-disable-line no-unused-vars
		const {userLocation} = this.props;

		options = {...options, ...this.state.mapOptions};

		options.locate = {
			on: false,
			userLocation,
			onLocationFound: this.onLocate
		};

		const {translations} = this.props.formContext;

		return (
			<Fullscreen onKeyDown={this.onKeyDown} tabIndex={-1} ref={this.setContainerRef}>
				<MapComponent
					{...options}
					clickBeforeZoomAndPan={false}
					viewLocked={false}
					controls={{draw: false}}
					ref={this.setMobileEditorMapRef}
					formContext={this.props.formContext} />
				{/* Circle is rendered inside the map container so the controls z-index can be above the circle mask.*/}
				{this.state.mapRendered && createPortal(this.getCircle(this.DEFAULT_RADIUS_PIXELS), this.map.container)}
				<div className="floating-buttons-container">
					<Button block onClick={this.onChange} ref={this.setOkButtonRef}>{translations.SetLocation}</Button>
					<Button block onClick={this.props.onClose}>{translations.Cancel}</Button>
				</div>
			</Fullscreen>
		);
	}
}
