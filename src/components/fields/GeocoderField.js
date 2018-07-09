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
import { FINLAND_BOUNDS } from "laji-map/lib/globals";

const cache = {};

@BaseComponent
export default class GeocoderField extends Component {
	static getName() {return "GeocoderField";}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		const geometryUpdated = equals(this.getGeometry(props), this.getGeometry(this.props)) ? false : undefined;
		this.setState(this.getStateFromProps(props, geometryUpdated));
	}

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
		const geometriesEqual = equals(this.getGeometry(this.props), geometry);
		if ((geometry && geometry.geometries && geometry.geometries.length === 0 && !geometriesEqual) || (!updateOnlyEmpty || !hasData) && ((loading === undefined && !this.state && geometry) || !geometriesEqual)) {
			button ? this.onButtonClick()(props) : this.update(props);
		}

		return state;
	}

	getButton(props, loading) {
		// Button is disabled when loading is false 
		// (it is false only after fetch and no formData updates, otherwise it will be true/undefined.

		const geometry = this.getGeometry(props);
		return {
			fn: this.onButtonClick,
			position: "top",
			key: loading,
			render: onClick => (
				<Button key="geolocate" onClick={onClick} disabled={!this.state.timeout && (loading === false || !geometry || !geometry.geometries || geometry.geometries.length === 0)}>
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
				this.setState({...this.getStateFromProps(this.props, false), timeout: false});
			});
		}) : 
		this.update(props, () => {
			this.setState({...this.getStateFromProps(this.props, false), timeout: false});
		});
	}

	getGeometry = (props) => {
		const {uiSchema, formData} = props;
		const {geometryField = "geometry"} = getUiOptions(uiSchema);
		let geometry = formData[geometryField];
		if ("type" in geometry && geometry.type !== "GeometryCollection") {
			geometry = {type:  "GeometryCollection", geometries: [geometry]};
		}
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

		if (!geometry || !geometry.geometries || !geometry.geometries.length) {
			let {formData} = props;
			fields.forEach(field => {
				formData = {
					...formData,
					[field]: undefined
				};
			});
			this.props.onChange(formData);
			return;
		}

		const bounds = L.geoJson({ // eslint-disable-line no-undef
			type: "FeatureCollection",
			features: geometry.geometries.map(geometry => {
				return {type: "Feature", properties: {}, geometry};
			})
		}).getBounds();
		const center = bounds.getCenter();
		const {lat, lng} = center;

		const join = (oldValue, value) => isEmptyString(oldValue) ? value : `${oldValue}, ${value}`;

		const afterFetch = (callback) => {
			if (this.fetching) {
				mainContext.popBlockingLoader();
				if (callback) callback();
			}
			this.fetching = false;
		};

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
					responseField: "long_name"
				},
				municipality: {
					type: ["municipality", "administrative_area_level_3", "administrative_area_level_2"],
					responseField: "long_name"
				},
				biologicalProvince: {
					type: ["biogeographicalProvince"],
					responseField: "long_name"
				}
			};

			if (response.status === "OK") {
				const found = {};
				Object.keys(parsers).forEach(field => {
					const parser = parsers[field];
					parser.type.some((type, typeIdx) => {
						response.results.forEach(result => result.address_components.forEach(addressComponent => {
							if (addressComponent.types.includes(type)) {
								if (!found[field]) found[field] = {};
								if (!found[field][typeIdx]) found[field][typeIdx] = {};
								const responseField = addressComponent[parser.responseField] ? parser.responseField : "short_name";
								found[field][typeIdx][addressComponent[responseField]] = true;
							}
						}));
						return found[field] && found[field][typeIdx];
					});
				});
				Object.keys(parsers).forEach(field => {
					if (found[field]) {
						const keys = Object.keys(found[field]);
						const responseForField = found[field][keys[0]];
						Object.keys(responseForField).forEach(value => {
							changes[field] = join(changes[field], value);
						});
					} else {
						changes[field] = "";
					}
				});
				if (country) changes.country = country;
				afterFetch(() => {
					this.props.onChange({...props.formData, ...changes});
					if (callback) callback();
				});
			} else if (country) {
				fetchForeign();
			}
		};

		const fetchForeign = () => {
			if (!props.formContext.googleApiKey) return afterFetch(callback);

			this.fetch(`https://maps.googleapis.com/maps/api/geocode/json\
					?latlng=${lat},${lng}\
					&key=${props.formContext.googleApiKey}\
					&language=en\
					&filter=country|administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`
				).then(handleResponse(undefined, "country", "municipality", "administrativeProvince")).catch(() => {
					afterFetch(callback);
				});
		};

		mainContext.pushBlockingLoader();

		this.fetching = true;

		this.getContext().setTimeout(() => {
			if (this.fetching) {
				afterFetch();
				this.setState({timeout: true}, () => {
					this.setState(this.getStateFromProps(this.props, false));
				});
			}
		}, 5 * 1000);

		!bounds.overlaps(FINLAND_BOUNDS) ? 
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
				afterFetch(callback);
			});
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} uiSchema={this.state.uiSchema} />;
	}
}
