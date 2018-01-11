import React, { Component } from "react";
import update from "immutability-helper";
import equals from "deep-equal";
import { getUiOptions, getInnerUiSchema, isEmptyString } from "../../utils";
import BaseComponent from "../BaseComponent";
import fetch from "isomorphic-fetch";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import { Button } from "../components";
import Spinner from "react-spinner";

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

	getOptions = (props) => {
		return {
			updateOnlyEmpty: false,
			button: false,
			fields: ["country", "municipality", "biologicalProvince", "administrativeProvince"],
			...getUiOptions((props || this.props).uiSchema)
		};
	}

	getStateFromProps(props, loading) {
		const state = {loading};
		const {updateOnlyEmpty, button, fields} = this.getOptions(props);
		const innerUiSchema = getInnerUiSchema(props.uiSchema);
		if (button) {
			state.uiSchema = {
				...innerUiSchema,
				"ui:options": {
					...getUiOptions(innerUiSchema),
					buttons: [
						...(getUiOptions(innerUiSchema).buttons || []),
						this.getButton(props, loading)
					]
				}
			};
		} else {
			state.uiSchema = innerUiSchema;
		}

		const hasData = fields.some(field => !isEmptyString(props.formData[field]));
		const geometry = this.getGeometry(props);
		if ((!updateOnlyEmpty || !hasData) && ((loading === undefined && !this.state && geometry) || !equals(this.getGeometry(this.props), geometry))) {
			button ? this.onButtonClick()(props) : this.update(props);
		}

		return state;
	}

	getButton(props, loading) {
		// Button is disabled when loading is false 
		// (it is false only after fetch and no formData updates, otherwise it will be true/undefined.
		return {
			fn: this.onButtonClick,
			position: "top",
			key: loading,
			render: onClick => (
				<Button key="geolocate" onClick={onClick} disabled={loading === false}>
					<strong>
						{loading ? <Spinner /> : <i className="glyphicon glyphicon-globe"/>}
						{" "}
						{props.formContext.translations.Geolocate}
					</strong>
				</Button>
			)
		};
	}

	onButtonClick = () => (props) => {
		this.mounted ? this.setState(this.getStateFromProps(this.props, true), () => {
			this.update(props, () => {
				this.setState(this.getStateFromProps(this.props, false));
			});
		}) : 
		this.update(props, () => {
			this.setState(this.getStateFromProps(this.props, false));
		});
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

	fetch = (url) => {
		cache[url] = cache[url] || fetch(url).then(response => {
			if (response.status >= 400) {
				throw new Error("Request failed");
			}
			return response.json();
		});
		return cache[url];
	}

	update = (props, callback) => {
		const geometry = this.getGeometry(props);
		const mainContext = new Context(props.formContext.contextId);
		const {fields} = this.getOptions();
		const fieldByKeys = fields.reduce((_fields, option) => {
			_fields[option] = true;
			return _fields;
		}, {});

		if (!geometry || !geometry.geometries || !geometry.geometries.length) return;
		const fetchForeign = () => {
			this.fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&email=helpdesk@laji.fi&accept-language=${props.formContext.lang}`).then(response => {
				const {country, town, state, county, city} = response.address;
				const changes = {};
				if (fieldByKeys.biologicalProvince) {
					changes.biologicalProvince = undefined;
				}
				if (fieldByKeys.country) {
					changes.country = country;
				}
				if (fieldByKeys.municipality) {
					changes.municipality = town || city || county;
				}
				if (fieldByKeys.administrativeProvince) {
					changes.administrativeProvince = state;
				}
				this.props.onChange({...props.formData, ...changes});
				mainContext.popBlockingLoader();
				if (callback) callback();
			}).catch(() => {
				mainContext.popBlockingLoader();
				if (callback) callback();
			});
		};

		const bounds = L.geoJson({ // eslint-disable-line no-undef
			type: "FeatureCollection",
			features: geometry.geometries.map(geometry => {
				return {type: "Feature", properties: {}, geometry};
			})
		}).getBounds();
		const finlandBounds = [[71.348, 33.783], [48.311, 18.316]];
		const center = bounds.getCenter();
		const {lat, lng} = center;

		mainContext.pushBlockingLoader();

		!bounds.overlaps(finlandBounds) ? 
			fetchForeign() :
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
				const changes = {};
				if (fieldByKeys.biologicalProvince) {
					changes.biologicalProvince = undefined;
				}
				if (fieldByKeys.administrativeProvince) {
					changes.administrativeProvince = undefined;
				}
				if (response.status === "OK") {
					changes.country = props.formContext.translations.Finland;
					response.results.forEach(result => {
						if (!result.types) return;
						const type = result.types[0];
						const join = (oldValue, value) => isEmptyString(oldValue) ? value : `${oldValue}, ${value}`;
						if (type === "municipality" && fieldByKeys.municipality) {
							changes.municipality = join(changes.municipality, result.formatted_address);
						} else if (type === "biogeographicalProvince"  && fieldByKeys.biologicalProvince) {
							changes.biologicalProvince = join(changes.biologicalProvince, result.address_components[0].long_name);
						}
					});
					this.props.onChange({...props.formData, ...changes});
					mainContext.popBlockingLoader();
					if (callback) callback();
				} else {
					fetchForeign();
				}
			}).catch(() => {
				mainContext.popBlockingLoader();
				if (callback) callback();
			});
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} uiSchema={this.state.uiSchema} />;
	}
}
