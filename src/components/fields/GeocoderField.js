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

		const bounds = L.geoJson({ // eslint-disable-line no-undef
			type: "FeatureCollection",
			features: geometry.geometries.map(geometry => {
				return {type: "Feature", properties: {}, geometry};
			})
		}).getBounds();
		const finlandBounds = [[71.348, 33.783], [48.311, 18.316]];
		const center = bounds.getCenter();
		const {lat, lng} = center;

		const join = (oldValue, value) => isEmptyString(oldValue) ? value : `${oldValue}, ${value}`;

		const handleResponse = (country, ...fields) => (response) => {
			fields = fields.reduce((_fields, field) => {
				_fields[field] = true;
				return _fields;
			}, {});

			const changes = {};
			if (fieldByKeys.biologicalProvince) {
				changes.biologicalProvince = undefined;
			}
			if (fieldByKeys.administrativeProvince) {
				changes.administrativeProvince = undefined;
			}

			const parsers = {
				country: {
					type: ["country"],
					responseField: "long_name"
				},
				administrativeProvince: {
					type: ["administrative_area_level_1"],
					responseField: "short_name"
				},
				municipality: {
					type: ["municipality", "administrative_area_level_2"],
					responseField: "short_name"
				},
				biologicalProvince: {
					type: ["biogeographicalProvince"],
					responseField: "long_name"
				}
			};

			// Store found values so they are used only once.
			const found = {};

			if (response.status === "OK") {
				response.results.forEach(result => {
					result.address_components.forEach(addressComponent => {
						if (!addressComponent.types) return;
						outer: for (const type of addressComponent.types) {
							for (const field in parsers) {
								const parser = parsers[field];
								if (parser.type.includes(type)) {
									const responseValue = addressComponent[parser.responseField];
									if (!found[field]) found[field] = {};
									if (!found[field][responseValue]) changes[field] = join(changes[field], responseValue);
									found[field][responseValue] = true;
									break outer;
								}
							}
						}
					});
				});
				if (country) changes.country = country;
				this.props.onChange({...props.formData, ...changes});
				mainContext.popBlockingLoader();
				if (callback) callback();
			} else if (country) {
				fetchForeign();
			}
		};

		const fetchForeign = () => {
			this.fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${props.formContext.googleApiKey}&language=en&filter=country|administrative_area_level_1|administrative_area_level_2`)
			    .then(handleResponse(undefined, "country", "municipality", "administrativeProvince")).catch(() => {
				mainContext.popBlockingLoader();
				if (callback) callback();
			});
		};

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
			}).then(handleResponse(props.formContext.translations.Finland, "municipality", "biologicalProvince")).catch(() => {
				mainContext.popBlockingLoader();
				if (callback) callback();
			});
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} uiSchema={this.state.uiSchema} />;
	}
}
