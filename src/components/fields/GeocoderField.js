import React, { Component } from "react";
import PropTypes from "prop-types";
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
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				updateOnlyEmpty: PropTypes.bool,
				button: PropTypes.bool,
				fields: PropTypes.arrayOf(PropTypes.oneOf((["country", "municipality",
					"biologicalProvince", "administrativeProvince"]))),
				geometryField: PropTypes.string,
				"fieldOptions": PropTypes.arrayOf(
					PropTypes.shape({
						field: PropTypes.string,
						enum: PropTypes.string
					})
				)
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return "GeocoderField";}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
		this.componentDidUpdate();
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

	componentDidUpdate(prevProps) {
		const {updateOnlyEmpty, button, fields} = this.getOptions(this.props);
		const hasData = fields.some(field => !isEmptyString(this.props.formData[field]));
		const geometry = this.getGeometry(this.props);
		const geometriesEqual = prevProps && equals(this.getGeometry(prevProps), geometry);
		const geometryEmpty = geometry && geometry.geometries && geometry.geometries.length === 0;
		if (updateOnlyEmpty && !geometryEmpty && hasData) {
			return;
		}
		if (!prevProps && hasData) {
			return;
		}
		if (
			(geometryEmpty && prevProps && !geometriesEqual) // was emptied
			||
			(((this.state.loading === undefined && !this.state && geometry) || !geometriesEqual))
		) {
			button ? this.onButtonClick()(this.props) : this.update(this.props);
		}
	}

	getStateFromProps(props, loading) {
		const state = {loading};
		const {button} = this.getOptions(props);
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
			this.update(props, (failed = false) => {
				this.setState({...this.getStateFromProps(this.props, false), timeout: failed});
			});
		}) : 
		this.update(props, (failed = false) => {
			this.setState({...this.getStateFromProps(this.props, false), timeout: failed});
		});
	}

	getGeometry = (props) => {
		const {uiSchema, formData} = props;
		const {geometryField = "geometry"} = getUiOptions(uiSchema);
		let geometry = formData[geometryField];
		if (!geometry.type) {
			geometry = {type: "GeometryCollection", geometries: []};
		} else if ("type" in geometry && geometry.type !== "GeometryCollection") {
			geometry = {type: "GeometryCollection", geometries: [geometry]};
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

		const afterFetch = (callback, timeout = false) => {
			if (this.fetching) {
				mainContext.popBlockingLoader();
				if (callback) callback(timeout);
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
					if (!fieldByKeys[field]) {
						return;
					}
					if (found[field]) {
						const keys = Object.keys(found[field]);
						const responseForField = found[field][keys[0]];
						Object.keys(responseForField).forEach(value => {
							// if target field is array
							if(this.props.schema.properties[field] && this.props.schema.properties[field].type === "array") {
								const temp = Array.from(this.props.formData[field]);

								// find correct enum from fieldOptions
								const fieldOptions = this.props.uiSchema["ui:options"].fieldOptions;
								const enumField = fieldOptions[fieldOptions.findIndex((element)=>{
									return element.field === field;
								})].enum;

								// find enum value from key (eg. municipalityName --> municipalityId)
								const mEnum = this.props.formContext.uiSchemaContext[enumField];
								const enumValue = mEnum.enum[
									mEnum.enumNames.indexOf(value)
								];

								// push enum value to changes (ignore duplicates)
								if (!temp.includes(enumValue)) {
									temp.push(enumValue);
									changes[field] = temp;
								}
							} else {
								changes[field] = join(changes[field], value);
							}
						});
					} else {
						changes[field] = "";
					}
				});
				if (country && fieldByKeys.country) changes.country = country;
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
					afterFetch(callback, !!"failed");
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
