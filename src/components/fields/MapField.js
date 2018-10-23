import React, { Component } from "react";
import PropTypes from "prop-types";
import { MapComponent } from "./MapArrayField";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class MapField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				mapOptions: PropTypes.object,
				height: PropTypes.number,
				emptyHelp: PropTypes.string
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
		const {mapOptions} = getUiOptions(uiSchema);
		if (mapOptions.singleton) {
			const map = this.getContext().singletonMap;
			if (map && map.getOptions().locate && map.userLocation) {
				this.onLocate(map.userLocation.latlng);
			}
		}
	}

	render() {
		const {TitleField} = this.props.registry.fields;
		const {uiSchema, formData} = this.props;
		const options = getUiOptions(uiSchema);
		const {height = 400, emptyHelp} = options;
		const isEmpty = !formData || !formData.geometries || !formData.geometries.length;
		const mapOptions = {
			clickBeforeZoomAndPan: true,
			...(options.mapOptions || {}),
			...(this.state.mapOptions || {})
		};

		const isSingleton = mapOptions.singleton;
		let singletonHasLocate = false;
		let singletonRendered = false;
		if (isSingleton) {
			const map = this.getContext().singletonMap;
			if (map) {
				singletonRendered = true;
				singletonHasLocate = map.getOptions().locate;
			}
		}

		if ((options.mapOptions || {}).createOnLocate && !this.state.mapOptions && (!singletonRendered ||  singletonHasLocate)) {
			mapOptions.locate = [this.onLocate];
		}

		return (
			<div>
				<TitleField title={this.props.schema.title} />
				<div style={{height}}>
					<MapComponent {...mapOptions}
					              draw={this.getDrawOptions()}
					              lang={this.props.formContext.lang}
					              zoomToData={true}
												panel={emptyHelp && isEmpty ? {panelTextContent: emptyHelp} : undefined}
					              formContext={this.props.formContext}
					              onOptionsChanged={this.onOptionsChanged} />
				</div>
			</div>
		);
	}

	getDrawOptions = () => {
		const options = getUiOptions(this.props.uiSchema);
		const {mapOptions = {}} = options;
		const {formData} = this.props;
		return {
			...(mapOptions.draw || {}),
			geoData: formData && Object.keys(formData).length ? formData : undefined,
			onChange: this.onChange
		};
	}

	onOptionsChanged = (options) => {
		this.setState({mapOptions: {...this.state.mapOptions, ...options}});
	}

	onChange = (events) => {
		let formData;
		events.forEach(e => {
			switch (e.type) {
			case "create":
				formData = {
					type: "GeometryCollection",
					geometries: [e.feature.geometry]
				};
				break;
			case "edit":
				formData = {
					type: "GeometryCollection",
					geometries: [e.features[0].geometry]
				};
				break;
			case "delete":
				formData = {
					type: "GeometryCollection",
					geometries: []
				};
			}
		});
		this.props.onChange(formData);
	}

	onLocate = (latlng) => {
		if (!latlng) return;
		const {formData} = this.props;
		const isEmpty = !formData || !formData.geometries || !formData.geometries.length;
		if (!isEmpty) {
			return;
		}
		this.props.onChange({type: "GeometryCollection", geometries: [{type: "Point", coordinates: [latlng.lng, latlng.lat]}]});
	}
}

