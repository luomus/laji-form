import * as React from "react";
import { createPortal, findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import { MapComponent } from "./MapArrayField";
import { getUiOptions, isObject } from "../../utils";
const equals = require("deep-equal");
import Spinner from "react-spinner";
import { Affix, Button, Fullscreen } from "../components";
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
				coordinateFields: PropTypes.shape({
					latitude: PropTypes.string.isRequired,
					longitude: PropTypes.string.isRequired
				})
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
	};

	constructor(props) {
		super(props);
		this.state = {
			located: false,
			moved: false
		};
		this.props.formContext.services.settings.bind(this, props);
	}

	onLocateEventHandler = (geometry) => {
		if (geometry) {
			this.onLocate({lat: geometry.coordinates[1], lng: geometry.coordinates[0]}, 100, !!"force");
		} else if (!this.getGeometry(this.props)) {
			this.setState({locateOn: true});
		}
	};

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

		const { mobileEditor } = getUiOptions(uiSchema);
		if (mobileEditor) { this.showMobileEditorMap(); }
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

	geocode = async (prevProps) => {
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
			const { name } = await this.props.formContext.apiClient.get(`/areas/${area}`);
			this.map.geocode(name, undefined, 8);
		}
	};

	zoomIfExternalEdit = (props) => {
		if (!equals(this._lastFormData, props.formData)) {
			this.map.zoomToData();
		}
	};

	setMapRef = (mapComponent) => {
		if (mapComponent && mapComponent.refs && mapComponent.refs.map) {
			this.map = mapComponent.refs.map.map;
			this.setState({mapRendered: true});
		}
	};

	showMobileEditorMap = () => {
		this.setState({mobileEditor: {visible: true, options: (this.state.mobileEditor || {}).options || {}}});
	};

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
				onLocationFound: this.onLocate,
				onLocationError: this.onLocateError
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

		if (mapOptions.createOnLocate && !this.state.mapOptions && (!singletonRendered || singletonHasLocate) && !_mobileEditor) {
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
							geometry={this.getMobileGeometry()}
							moved={this.state.moved}
							setMoved={this.setMoved}
							defaultLocation={!this.props.formData && !this.map?.userLocation}
						/>
				}
			</div>
		);
	}

	getDrawOptions = (props) => {
		const {uiSchema, disabled, readonly} = props;
		const options = getUiOptions(uiSchema);
		const {mapOptions = {}, coordinateFields} = options;
		const drawOptions = {
			...(mapOptions.draw || {}),
			geoData: this.getGeometry(props),
			onChange: this.onChange,
			editable: !disabled && !readonly && !options.mobileEditor
		};
		if (coordinateFields) {
			["rectangle", "polygon", "polyline", "circle"].forEach(drawType => {
				drawOptions[drawType] = false;
			});
		}
		return drawOptions;
	};

	getGeometry = (props) => {
		const {formData} = props;
		const {coordinateFields} = getUiOptions(this.props.uiSchema);

		if (coordinateFields) {
			if (formData?.[coordinateFields.longitude] !== undefined && formData?.[coordinateFields.latitude] !== undefined) {
				return {
					type: "Point",
					coordinates: [+formData[coordinateFields.longitude], +formData[coordinateFields.latitude]]
				};
			} else {
				return undefined;
			}
		}

		return formData && Object.keys(formData).length ? formData : undefined;
	};

	getMobileGeometry = () => {
		if (this.props.formData) {
			return this.props.formData;
		} else {
			return {
				type: "Point",
				coordinates: [24.94782264266911, 60.17522413438655]
			};
		}
	};

	getFormDataFromGeometry = (geometry) => {
		const {geometryCollection = true, coordinateFields} = getUiOptions(this.props.uiSchema);

		let formData;

		if (coordinateFields) {
			if (geometry) {
				let longitude = geometry.coordinates[0];
				let latitude = geometry.coordinates[1];

				if (this.props.schema.properties[coordinateFields.longitude].type === "string") {
					longitude = "" + longitude;
				}
				if (this.props.schema.properties[coordinateFields.latitude].type === "string") {
					latitude = "" + latitude;
				}

				formData = {
					[coordinateFields.longitude]: longitude,
					[coordinateFields.latitude]: latitude
				};
			} else {
				formData = undefined;
			}
		} else {
			formData = geometryCollection ? {
				type: "GeometryCollection",
				geometries: geometry ? [geometry] : []
			} : geometry || {};
		}

		return formData;
	};

	setMoved = (moved) => {
		this.setState({ moved });
	};

	onOptionsChanged = (options) => {
		this.setState({mapOptions: {...this.state.mapOptions, ...options}});
	};

	onChange = (events) => {
		let formData;
		events.forEach(e => {
			switch (e.type) {
			case "create":
				formData = this.getFormDataFromGeometry(e.feature.geometry);
				break;
			case "edit":
				formData = this.getFormDataFromGeometry(e.features[0].geometry);
				break;
			case "delete":
				formData = this.getFormDataFromGeometry(undefined);
			}
		});
		this._zoomToDataOnNextTick = true;
		this.props.onChange(formData);
	};

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
	};

	onHideMobileEditorMap = (options) => {
		this.setState({mobileEditor: {visible: false, options}});
	};

	onLocate = (latlng, radius, forceShow) => {
		const {mobileEditor, createOnLocate} = getUiOptions(this.props.uiSchema);
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
			this.props.onChange(this.getFormDataFromGeometry(geometry));
		}
	};

	onLocateError = () => {
		this.setState({
			mobileEditor: { 
				visible: true,
				options: (this.state.mobileEditor || {}).options || {}
			},
		});

	};

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
		const { geometry } = this.props;

		this.state = {
			geometry: [{ geoData: geometry}],
			locateActive: false,
			hasLocated: false
		};
	}

	setMobileEditorMapRef = (mapComponent) => {
		if (mapComponent && mapComponent.refs && mapComponent.refs.map) {
			this.map = mapComponent.refs.map.map;
		}

		this.setState({mapRendered: true});
	};

	setOkButtonRef = (elem) => {
		this.okButtonElem = findDOMNode(elem);
	};

	componentDidMount() {
		this.mounted = true;
		this.okButtonElem.focus();
		this.map.setLocateOff();

		if (this.props.geometry) {
			const [lng, lat] = this.props.geometry.coordinates;
			this.setMarkerLatLng({lng, lat});
			if (this.props.defaultLocation) {
				this.map.map.setView({lng, lat}, 4);
			} else {
				this.map.map.setView({lng, lat}, 12);
				this.props.setMoved(true);
			}
			this.marker.on("dragend", () => {
				if (!this.props.moved) { this.props.setMoved(true); }
			});
		}

		this.map.map.on("click", this.handleMapClick);
	}

	componentWillUnmount() {
		this.mounted = false;

		if (this.marker) {
			this.marker.remove();
		}

		this.map.map.off("click", this.handleMapClick);
	}

	onChange = () => {
		if (this.marker) {
			const {lat, lng} = this.marker.getLatLng();
			this.map.map.setView({lng, lat}, 12);
			const markerGeometry = {
				type: "Point",
				coordinates: [lng, lat]
			};
			this.props.onChange(markerGeometry);
		}
		this.onClose();
	};

	handleMapClick = (e) => {
		if (!this.props.moved) { this.props.setMoved(true); }
		this.setMarkerLatLng(e.latlng);
	};

	setMarkerLatLng = (latlng) => {
		if (this.marker) {
			this.marker.setLatLng(latlng);
		} else {
			this.marker = L.marker(latlng, { icon: this.map._createIcon(), draggable: true }).addTo(this.map.map);
		}
	};

	invisibleStyle = () => {
		return {
			opacity: 0,
			fillOpacity: 0
		};
	};

	onKeyDown = ({key}) => {
		if (key === "Escape") {
			this.onClose();
		}
	};

	activateLocate = () => {
		this.handleLocateToggle(true);
	};

	handleLocateToggle = (bool) => {
		this.setState({ locateActive: bool, hasLocated: false });
		this.map.setOption("locate", { on: bool });
	};

	onLocate = (latlng) => {
		if (!latlng || this.state.hasLocated) { return; }

		this.map.map.setView({lng: latlng.lng, lat: latlng.lat}, 12);
		this.setMarkerLatLng(latlng);

		if (!this.state.hasLocated) { this.setState({hasLocated: true}); }
		if (!this.props.moved) { this.props.setMoved(true); }
	};

	render() {
		let {rootElem, customControls, draw, data, zoomToData, zoom, locate, ...options} = this.props.map.getOptions();  
		const {userLocation} = this.props;

		const {translations} = this.props.formContext;

		const mapComponentProps = {
			...options, ...(this.props.options || {}),
			locate: {
				on: this.state.locateActive,
				userLocation,
				onLocationFound: this.onLocate,
				panOnFound: false
			},
			singleton: true,
			clickBeforeZoomAndPan: false,
			viewLocked: false,
			controls: { draw: false },
			ref: this.setMobileEditorMapRef,
			formContext: this.props.formContext,
			panel: {
				panelTextContent: this.props.formContext.translations.MobileMapInstructions
			}
		};
		return (
			<Fullscreen onKeyDown={this.onKeyDown} tabIndex={-1} ref={this.setContainerRef} formContext={this.props.formContext}>
				<MapComponent
					{...mapComponentProps}
					onLocateToggle={this.handleLocateToggle}
				/>
				<div className="floating-buttons-container">
					<Button block onClick={this.onChange} className={"choose-location-button"} variant={"primary"} ref={this.setOkButtonRef} disabled={!this.props.moved}>{translations.ChooseThisLocation}</Button>
					<Button block onClick={this.activateLocate} className={"locate-me-button"} variant={"default"} disabled={this.state.locateActive}>{translations.LocateMe}</Button>
				</div>
			</Fullscreen>
		);
	}

	onClose = () => {
		this.props.onClose(this.map.getOptions());
	};
}
