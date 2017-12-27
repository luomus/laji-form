import { Component } from "react";
import { getUiOptions } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";
import fetch from "isomorphic-fetch";
import ApiClient from "../../ApiClient";

const cache = {};

@VirtualSchemaField
export default class GeocoderField extends Component {
	static getName() {return "GeocoderField";}

	getStateFromProps(props) {
		const uiSchema = {
			...props.uiSchema,
			"ui:options": {
				...getUiOptions(props.uiSchema),
				buttons: [
					...(getUiOptions(props.uiSchema).buttons || []),
					this.getButton(props)
				]
			}
		};

		return {uiSchema};
	}

	getButton(props) {
		return {
			label: props.formContext.translations.Geolocate,
			fn: this.onButtonClick,
			glyph: "globe",
			position: "top"
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
		Promise.all([
			this.fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`).then(response => {
				const {country_code, town, state, county} = response.address;
				changes.country = country_code;
				changes.municipality = undefined;
				changes.administrativeProvince = undefined;
				if (country_code === "fi") {
					changes.municipality = town;
				} else {
					changes.administrativeProvince = county || town || state;
				}
			}),
			new ApiClient().fetchCached("/coordinates/biogeographicalProvince", {latlng: [lat, lng].join(",")}).then(response => {
				if (response.results && response.results.length) {
					changes.biologicalProvince = response.results[0].place_id;
				}
			})
		]).then(() => {
			this.props.onChange({...this.props.formData, ...changes});
		})
	}
}
