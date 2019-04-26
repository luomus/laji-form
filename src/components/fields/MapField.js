import React, { Component } from "react";
import PropTypes from "prop-types";
import { MapComponent } from "./MapArrayField";
import { Affix } from "../components";
import { getUiOptions, isObject } from "../../utils";
import BaseComponent from "../BaseComponent";
import ApiClient from "../../ApiClient";

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
				this.onLocate(map.userLocation.latlng);
			}
		}
		this.geocode(this.props);
	}

	componentDidUpdate(prevProps) {
		this.geocode(prevProps);
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

	setMapRef = (mapComponent) => {
		if (mapComponent && mapComponent.refs && mapComponent.refs.map) {
			this.map = mapComponent.refs.map.map;
		}
	}

	render() {
		const {TitleField} = this.props.registry.fields;
		const {uiSchema, formData} = this.props;
		const {height = 400, emptyHelp, mapOptions = {}} = getUiOptions(uiSchema);
		const isEmpty = !formData || !formData.geometries || !formData.geometries.length;
		const _mapOptions = {
			clickBeforeZoomAndPan: true,
			...mapOptions,
			...(this.state.mapOptions || {})
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
			_mapOptions.locate = [this.onLocate];
		}

		const {lang, topOffset, bottomOffset} = this.props.formContext;

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
						</div>
					</Affix>
			</div>
		);
	}

	getDrawOptions = (props) => {
		const {uiSchema, disabled, readonly} = props;
		const options = getUiOptions(uiSchema);
		const {mapOptions = {}} = options;
		const {formData} = props;
		return {
			...(mapOptions.draw || {}),
			geoData: formData && Object.keys(formData).length ? formData : undefined,
			onChange: this.onChange,
			editable: !disabled && !readonly
		};
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
				} : e.feature.geometry;
				break;
			case "delete":
				formData = geometryCollection ? {
					type: "GeometryCollection",
					geometries: []
				} : {};
			}
		});
		this.props.onChange(formData);
	}

	onLocate = (latlng) => {
		const {geometryCollection = true} = getUiOptions(this.props.uiSchema);
		const isEmpty = !formData || !formData.geometries || !formData.geometries.length;
		if (!latlng || !isEmpty) {
			return;
		}
		const {formData} = this.props;
		const geometry = {type: "Point", coordinates: [latlng.lng, latlng.lat]};
		this.props.onChange(geometryCollection ? {type: "GeometryCollection", geometries: [geometry]} : geometry);
	}
}

