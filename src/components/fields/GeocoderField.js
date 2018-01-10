import React, { Component } from "react";
import update from "immutability-helper";
import equals from "deep-equal";
import { getUiOptions, getInnerUiSchema, isEmptyString } from "../../utils";
import BaseComponent from "../BaseComponent";
import fetch from "isomorphic-fetch";
import ApiClient from "../../ApiClient";
import Context from "../../Context";

const cache = {};

@BaseComponent
export default class GeocoderField extends Component {
	static getName() {return "GeocoderField";}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentWillReceiveProps(props) {
		const {country, municipality, biologicalProvince, administrativeProvince} = props.formData;
		const hasData = [country, municipality, biologicalProvince, administrativeProvince].some(field => !isEmptyString(field));
		if (!hasData && !equals(this.getGeometry(this.props), this.getGeometry(props))) {
			this.update(props);
		}
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

	getGeometry = (props) => {
		const {uiSchema, formData} = props;
		const {geometryField = "geometry"} = getUiOptions(uiSchema);
		let geometry = formData[geometryField];
		if (formData.units) formData.units.forEach(({unitGathering}) => {
			if (unitGathering && unitGathering.geometry  && unitGathering.geometry.coordinates) {
				geometry = update(geometry, {geometries: {$push: [unitGathering.geometry]}});
			}
		});
		return geometry;
	}

	update = (props) => {
		const geometry = this.getGeometry(props);

		if (!geometry || !geometry.geometries.length) return;

		const center = L.geoJson({ // eslint-disable-line no-undef
			type: "FeatureCollection",
			features: geometry.geometries.map(geometry => {
				return {type: "Feature", properties: {}, geometry};
			})
		}).getBounds().getCenter();
		const {lat, lng} = center;

		const changes = {};
		const mainContext = new Context(props.formContext.contextId);
		mainContext.pushBlockingLoader();
		new ApiClient().fetchRaw("/coordinates/location", undefined, {
			method: "POST",
			headers: {
				"accept": "application/json",
				"content-type": "application/json"
			},
			body: JSON.stringify(geometry)
		}).then(response => {
			return response.json();
		}).then(response => {
			changes.biologicalProvince = undefined;
			if (response.status === "OK") {
				changes.country = props.formContext.translations.Finland;
				response.results.forEach(result => {
					if (!result.types) return;
					const type = result.types[0];
					const join = (oldValue, value) => isEmptyString(oldValue) ? value : `${oldValue}, ${value}`;
					if (type === "municipality") {
						changes.municipality = join(changes.municipality, result.formatted_address);
					} else if (type === "biogeographicalProvince") {
						changes.biologicalProvince = join(changes.municipality, result.address_components[0].long_name);
					}
				});
				props.onChange({...props.formData, ...changes});
				mainContext.popBlockingLoader();
			} else {
				this.fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&email=helpdesk@laji.fi&accept-language=${props.formContext.lang}`).then(response => {
					const {country, town, state, county, city} = response.address;
					changes.country = country;
					changes.municipality = town || city || county;
					changes.administrativeProvince = state;
					props.onChange({...props.formData, ...changes});
					mainContext.popBlockingLoader();
				});
			}

		}).catch(() => {
			mainContext.popBlockingLoader();
		});
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} uiSchema={getInnerUiSchema(this.props.uiSchema)} />;
	}
}
