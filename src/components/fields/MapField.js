import * as React from "react";
import { createPortal, findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import { MapComponent } from "./MapArrayField";
import { Affix } from "../components";
import { getUiOptions, isObject } from "../../utils";
const equals = require("deep-equal");
import * as Spinner from "react-spinner";
import { Button, Fullscreen } from "../components";
import { anyToFeatureCollection } from "@luomus/laji-map/lib/utils";
import { getTemplate } from "@rjsf/utils";

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

export default class MapField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				mapOptions: PropTypes.object,
				height: PropTypes.number,
				emptyHelp: PropTypes.string,
				geometryCollection: PropTypes.bool,
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
	}

	constructor(props) {
		super(props);
		this.state = {located: false};
		this.props.formContext.services.settings.bind(this, props);
	}

	onLocateEventHandler = (geometry) => {
		if (geometry) {
			this.onLocate({lat: geometry.coordinates[1], lng: geometry.coordinates[0]}, 100, !!"force");
		} else if (!this.getGeometry(this.props)) {
			this.setState({locateOn: true});
		}
	}

	componentDidMount() {
		const {uiSchema} = this.props;
		const {mapOptions = {}} = getUiOptions(uiSchema);
		if (mapOptions.singleton) {
			const {map} = this.props.formContext.services.singletonMap;
			if (map && map.getOptions().locate && map.userLocation) {
				this.onLocate(map.userLocation.latlng, map.userLocation.accuracy);
			}
		}
		this.geocode(this.props);

		this.props.formContext.services.customEvents.add(this.props.idSchema.$id, "locate", this.onLocateEventHandler);
	}

	componentWillUnmount() {
		this.props.formContext.services.customEvents.remove(this.props.idSchema.$id, "locate", this.onLocateEventHandler);
	}

	componentDidUpdate(prevProps) {
		this.geocode(prevProps);
		this.zoomIfExternalEdit(this.props);
		this._lastFormData = this.props.formData;
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
			this.props.formContext.apiClient.fetch(`/areas/${area}`, undefined, undefined).then((result) => {
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
		this.setState({mobileEditor: {visible: true, options: (this.state.mobileEditor || {}).options || {}}});
	}

	render() {
		const TitleFieldTemplate = getTemplate("TitleFieldTemplate", this.props.registry, getUiOptions(this.props.uiSchema));
		const {uiSchema, formData} = this.props;
		const {height = 400, emptyHelp, mapOptions = {}, mobileEditor: _mobileEditor, data} = getUiOptions(uiSchema);
		const isEmpty = !formData || !formData.geometries || !formData.geometries.length;
		const _mapOptions = {
			controls: true,
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
			const {map} = this.props.formContext.services.singletonMap;
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
			_mapOptions.viewLocked = true;
			_mapOptions.customControls = [{
				text: this.props.formContext.translations.ChooseLocation,
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

		const extraData = Array.isArray(data) ? data : [data].map((geoData) => ({geoData}));

		return (
			<div>
				<TitleFieldTemplate title={this.props.schema.title}  schema={this.props.schema} />
				<Affix {...{topOffset, bottomOffset}}>
					<div style={{height}}>
						<MapComponent
							{..._mapOptions}
							ref={this.setMapRef}
							draw={this.getDrawOptions(this.props)}
							data={extraData}
							lang={lang}
							zoomToData={{paddingInMeters: 200}}
							panel={emptyHelp && isEmpty ? {panelTextContent: emptyHelp} : undefined}
							formContext={this.props.formContext}
							onOptionsChanged={this.onOptionsChanged} />
						{this.map && this.map.container && createPortal(this.renderBlocker(), this.map.container)}
					</div>
				</Affix>
				{this.state.mapRendered && mobileEditor && mobileEditor.visible &&
						<MobileEditorMap {...mobileEditorOptions}
							options={mobileEditor.options}
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

	onHideMobileEditorMap = (options) => {
		this.setState({mobileEditor: {visible: false, options}});
	}

	onLocate = (latlng, radius, forceShow) => {
		const {geometryCollection = true, mobileEditor, createOnLocate} = getUiOptions(this.props.uiSchema);
		const isEmpty = !this.getGeometry(this.props);
		if (!latlng || !isEmpty) {
			this.setState({located: true});
			return;
		}
		if (mobileEditor) {
			if (!this.state.located || forceShow) {
				this.setState({
					mobileEditor: {
						visible: true,
						center: latlng,
						radius,
						options: (this.state.mobileEditor || {}).options || {}
					},
					located: true
				});
			}
			return;
		}
		this.setState({located: true});
		if (createOnLocate) {
			const geometry = {type: "Point", coordinates: [latlng.lng, latlng.lat]};
			this.props.onChange(geometryCollection ? {type: "GeometryCollection", geometries: [geometry]} : geometry);
		}
	}

	renderBlocker() {
		const {blockBeforeLocation} = getUiOptions(this.props.uiSchema);
		const geometry = this.getGeometry(this.props);
		if (blockBeforeLocation && !this.state.located && !geometry) {
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

class MobileEditorMap extends React.Component {
	DEFAULT_RADIUS_PIXELS = 100;

	constructor(props) {
		super(props);
		const {center, radius} = this.props;

		this.state = {
			mapOptions: this.setViewFromCenterAndRadius(center, radius),
			width: window.visualViewport?.width || window.innerWidth,
			height: window.visualViewport?.height || window.innerHeight,
		};
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

	updateDimensions = () => {
		this.setState({ width: window.visualViewport?.width || window.innerWidth, height: window.visualViewport?.height || window.innerHeight });
	};

	componentDidMount() {
		this.mounted = true;
		this.okButtonElem.focus();
		window.addEventListener("resize", this.updateDimensions);
	}

	componenWillUnmount() {
		this.mounted = false;
		window.removeEventListener("resize", this.updateDimensions);
	}

	getCircle(radiusPixels) {
		return (
			<svg width={this.state.width} height={this.state.height} style={{position: "absolute", zIndex: 1000, top: 0, left: 0, pointerEvents: "none"}}>
				<defs>
					<mask id="mask" x="0" y="0" width={this.state.width} height={this.state.height}>
						<rect x="0" y="0" width={this.state.width} height={this.state.height} fill="#fff"></rect>
						<circle cx={this.state.width / 2} cy={this.state.height / 2} r={radiusPixels}></circle>
					</mask>
				</defs>
				<rect x="0" y="0" width={this.state.width} height={this.state.height} mask="url(#mask)" fillOpacity="0.2"></rect>
				<circle cx={this.state.width / 2} cy={this.state.height / 2} r={radiusPixels} stroke="black" strokeWidth="2" fillOpacity="0"></circle>
				<line
					x1={this.state.width / 2}
					y1={this.state.height / 2 - radiusPixels}
					x2={this.state.width / 2}
					y2={this.state.height / 2 + radiusPixels}
					stroke="black"
					strokeWidth="2"
				/>
				<line
					x1={this.state.width / 2 - radiusPixels}
					y1={this.state.height / 2}
					x2={this.state.width / 2 + radiusPixels}
					y2={this.state.height / 2}
					stroke="black"
					strokeWidth="2"
				/>
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
		this.onClose();
	}

	computePadding = () => {
		// If the rendered element wasn't full screen, we couldn't use these as height/width.
		const height = window.visualViewport?.height || window.innerHeight;
		const width = window.visualViewport?.width || window.innerWidth;
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
			this.onClose();
		}
	}

	onLocate = (latlng, accuracy) => {
		if (this.props.center || !this.mounted) return;

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
		let {rootElem, customControls, draw, data, zoomToData, zoom, center, locate, ...options} = this.props.map.getOptions(); // eslint-disable-line @typescript-eslint/no-unused-vars
		const {userLocation} = this.props;

		
		options = {...options, ...(this.props.options || {}), ...this.state.mapOptions};

		options.locate = {
			on: true,
			userLocation,
			onLocationFound: this.onLocate,
			panOnFound: false
		};

		const {translations} = this.props.formContext;

		return (
			<Fullscreen onKeyDown={this.onKeyDown} tabIndex={-1} ref={this.setContainerRef} formContext={this.props.formContext}>
				<MapComponent
					{...options}
					singleton={true}
					clickBeforeZoomAndPan={false}
					viewLocked={false}
					controls={{draw: false}}
					ref={this.setMobileEditorMapRef}
					formContext={this.props.formContext} />
				{/* Circle is rendered inside the map container so the controls z-index can be above the circle mask.*/}
				{this.state.mapRendered && createPortal(this.getCircle(this.DEFAULT_RADIUS_PIXELS), this.map.container)}
				<div className="floating-buttons-container">
					<Button block onClick={this.onChange} ref={this.setOkButtonRef}>{translations.ChooseThisLocation}</Button>
					<Button block onClick={this.onClose}>{translations.Cancel}</Button>
				</div>
			</Fullscreen>
		);
	}

	onClose = () => {
		this.props.onClose(this.map.getOptions());
	}
}
