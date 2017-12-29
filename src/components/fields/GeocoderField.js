import React, { Component } from "react";
import { getUiOptions, getInnerUiSchema } from "../../utils";
import BaseComponent from "../BaseComponent";
import fetch from "isomorphic-fetch";
import ApiClient from "../../ApiClient";
import { Button } from "../components";
import Spinner from "react-spinner";

const cache = {};

@BaseComponent
export default class GeocoderField extends Component {
	static getName() {return "GeocoderField";}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props, false);
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	getStateFromProps(props, loading) {
		const innerUiSchema = getInnerUiSchema(props.uiSchema);
		const uiSchema = {
			...innerUiSchema,
			"ui:options": {
				...getUiOptions(innerUiSchema),
				buttons: [
					...(getUiOptions(innerUiSchema).buttons || []),
					this.getButton(props, loading)
				]
			}
		};

		const state = {uiSchema, loading};
		return state;
	}

	getButton(props, loading) {
		return {
			fn: this.onButtonClick,
			position: "top",
			key: loading,
			render: onClick => (
				<Button key="geolocate" onClick={onClick} disabled={loading}>
					<strong>
						{loading ? <Spinner /> : <i className="glyphicon glyphicon-globe"/>}
						{" "}
						{props.formContext.translations.Geolocate}
					</strong>
				</Button>
			)
		};
	}

	fetch = (url) => {
		cache[url] = cache[url] || fetch(url).then(response => {
			if (response.status >= 400) {
				throw new Error("Request failed");
			}
			return response.json();
		});
		return cache[url];
	}

	onButtonClick = () => () => {
		const {formData, uiSchema} = this.props;
		const {geometryField = "geometry"} = getUiOptions(uiSchema);
		const geometry = formData[geometryField];

		if (!geometry || !geometry.geometries.length) return;

		const center = L.geoJson({ // eslint-disable-line no-undef
			type: "FeatureCollection",
			features: geometry.geometries.map(geometry => {
				return {type: "Feature", properties: {}, geometry};
			})
		}).getBounds().getCenter();
		const {lat, lng} = center;

		const changes = {};
		this.setState(this.getStateFromProps(this.props, true), () => {
			Promise.all([
				this.fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&email=helpdesk@laji.fi&accept-language=${this.props.formContext.lang}`).then(response => {
					const {country, country_code, town, state, state_district, county} = response.address;
					changes.country = country;
					changes.municipality = undefined;
					changes.administrativeProvince = undefined;
					if (country_code === "fi") {
						changes.municipality = town;
					} else {
						changes.administrativeProvince = county || state || state_district || town;
					}
				}),
				new ApiClient().fetchCached("/coordinates/biogeographicalProvince", {latlng: [lat, lng].join(",")}).then(response => {
					changes.biologicalProvince = undefined;
					if (response.results && response.results.length) {
						changes.biologicalProvince = response.results[0].formatted_address;
					}
				})
			]).then(() => {
				if (this.mounted) {
					this.setState(this.getStateFromProps(this.props, false), 
						() => this.props.onChange({...this.props.formData, ...changes})
					);
				} else {
					this.props.onChange({...this.props.formData, ...changes});
				}
			}).catch(() => {
				if (!this.mounted) return;
				this.setState(this.getStateFromProps(this.props, false));
			});
		});
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} uiSchema={this.state.uiSchema} />;
	}
}
