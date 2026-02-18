import * as React from "react";
import * as PropTypes from "prop-types";
import update from "immutability-helper";
const equals = require("deep-equal");
import { getUiOptions, getInnerUiSchema, isEmptyString, updateSafelyWithJSONPointer, parseJSONPointer, getDefaultFormState, getFieldUUID } from "../../utils";
import BaseComponent from "../BaseComponent";
import fetch from "isomorphic-fetch";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";
import { Button } from "../components";
import Spinner from "react-spinner";

const cache = {};

@BaseComponent
export default class GeocoderField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				updateOnlyEmpty: PropTypes.bool,
				button: PropTypes.bool,
				fields: PropTypes.arrayOf(PropTypes.oneOf((["country", "municipality",
					"biologicalProvince", "biogeographicalProvince", "administrativeProvince"]))),
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
		formData: PropTypes.object
	};

	static getName() {return "GeocoderField";}
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		const loading = this.getComponentContext().fetching;
		this.state = this.getStateFromProps(props, loading);
	}

	UNSAFE_componentWillReceiveProps(props) {
		const geometryUpdated = equals(this.getGeometry(props), this.getGeometry(this.props)) ? false : undefined;
		this.setState(this.getStateFromProps(props, geometryUpdated));
	}

	onLocate = (geometry) => {
		this.updateForGeometry(this.props, undefined, this.normalizeGeometry(geometry));
	};

	componentDidMount() {
		this.mounted = true;
		this.componentDidUpdate();
		this.props.formContext.services.customEvents.add(this.props.idSchema.$id, "locate", this.onLocate);
		this.getComponentContext().resetRemountedState = (loading) => this.setState(this.getStateFromProps(this.props, loading));
	}

	componentWillUnmount() {
		this.mounted = false;
		this.props.formContext.services.customEvents.remove(this.props.idSchema.$id, "locate", this.onLocate);
		delete this.getComponentContext().resetRemountedState;
	}

	getOptions = (props) => {
		return {
			updateOnlyEmpty: false,
			button: false,
			fields: ["country", "municipality", "biologicalProvince", "biogeographicalProvince", "administrativeProvince"],
			...getUiOptions((props || this.props).uiSchema)
		};
	};

	componentDidUpdate(prevProps) {
		const {updateOnlyEmpty, button, fields} = this.getOptions(this.props);
		const hasData = fields.some(field => !isEmptyString((this.props.formData || {})[field]));
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
			button ? this.onButtonClick()() : this.update(this.props);
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
				<Button key="geolocate" onClick={onClick} disabled={loading || props.disabled || props.readonly || !this.state.timeout && (loading === false || !geometry || !geometry.geometries || geometry.geometries.length === 0)} className="geocoder-btn">
					{loading ? <Spinner /> : <ReactContext.Consumer>{({theme: {Glyphicon}}) => <Glyphicon glyph="globe"/>}</ReactContext.Consumer>}
					{" "}
					{props.formContext.translations.Geolocate}
				</Button>
			)
		};
	}

	onButtonClick = () => () => {
		this.mounted ? this.setState(this.getStateFromProps(this.props, true), () => {
			this.update(this.props, (failed = false) => {
				this.fetchedButton = this.fetchedButton ? this.fetchedButton + 1 : 1;
				this.mounted && this.setState({...this.getStateFromProps(this.props, false), timeout: failed});
			});
		}) : 
			this.update(this.props, (failed = false) => {
				this.mounted && this.setState({...this.getStateFromProps(this.props, false), timeout: failed});
			});
	};

	getGeometry = (props) => {
		const {uiSchema, formData = {}} = props;
		const {geometryField = "geometry"} = getUiOptions(uiSchema);
		let geometry = this.normalizeGeometry(formData[geometryField]);

		// TODO misses geometry collections
		if (formData.units) formData.units.forEach(({unitGathering}) => {
			if (unitGathering && unitGathering.geometry  && unitGathering.geometry.coordinates) {
				geometry = update(geometry, {geometries: {$push: [unitGathering.geometry]}});
			}
		});
		return geometry;
	};

	normalizeGeometry = (geometry) => {
		if (!geometry || !geometry.type) {
			geometry = {type: "GeometryCollection", geometries: []};
		} else if ("type" in geometry && geometry.type !== "GeometryCollection") {
			geometry = {type: "GeometryCollection", geometries: [geometry]};
		}
		return geometry;
	};

	fetch = (url) => {
		cache[url] = cache[url] || fetch(url).then(response => {
			if (response.status >= 400) {
				throw new Error(this.props.formContext.translations.RequestFailed);
			}
			return response.json();
		}).catch(() => {
			delete cache[url];
			throw new Error(this.props.formContext.translations.RequestFailed);
		});
		return cache[url];
	};

	update = (props, callback) => {
		const geometry = this.getGeometry(props);
		this.updateForGeometry(props, callback, geometry);
	};

	getComponentContext = () => {
		return getContext(`${this.props.formContext.contextId}_${getFieldUUID(this.props)}_GEOCODERFIELD`);
	};

	updateForGeometry = (props, callback, geometry) => {
		const {fields} = this.getOptions();
		const fieldByKeys = fields.reduce((_fields, option) => {
			_fields[option] = true;
			return _fields;
		}, {});

		if (!geometry || !geometry.geometries || !geometry.geometries.length) {
			this.mounted && this.setState(this.getStateFromProps(props, false));
			return;
		}

		const join = (oldValue, value) => isEmptyString(oldValue) ? value : `${oldValue}, ${value}`;

		const lajiFormInstance = props.formContext.services.rootInstance;
		const timestamp = Date.now();
		this.promiseTimestamp = timestamp;
		const doAsync = () => {
			this.getComponentContext().hook = props.formContext.services.submitHooks.add(props, () => new Promise((resolve, reject) => {
				const afterFetch = (callback, timeout = false) => {
					if (this.getComponentContext().fetching) {
						if (callback) callback(timeout);
					}
					this.getComponentContext().fetching = false;
					if (this.getComponentContext().resetRemountedState) this.getComponentContext().resetRemountedState(false);
				};
				const success = (callback, timeout) => {
					afterFetch(callback, timeout);
					resolve();
				};
				const fail = (e, callback, timeout) => {
					afterFetch(callback, timeout);
					reject(e);
				};

				const handleResponse = (...fields) => (response) => {
					fields = fields.reduce((_fields, field) => {
						_fields[field] = true;
						return _fields;
					}, {});

					const changes = {};
					if (fieldByKeys.biologicalProvince) {
						changes.biologicalProvince = undefined;
					}
					if (fieldByKeys.biogeographicalProvince) {
						changes.biogeographicalProvince = undefined;
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
						},
						biogeographicalProvince: {
							type: ["biogeographicalProvince"],
							responseField: "long_name"
						}
					};

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
						if (!fieldByKeys[field] || !this.props.schema.properties[field]) {
							return;
						}
						if (found[field]) {
							const keys = Object.keys(found[field]);
							const responseForField = found[field][keys[0]];
							Object.keys(responseForField).forEach(value => {
								// If target field is array.
								if (this.props.schema.properties[field].type === "array") {
									const temp = Array.from((this.props.formData || {})[field] || []);

									// Find correct enum from fieldOptions.
									const fieldOptions = this.props.uiSchema["ui:options"].fieldOptions;
									const enumField = fieldOptions[fieldOptions.findIndex(element => {
										return element.field === field;
									})].enum;

									// Find enum value from key (eg. municipalityName --> municipalityId).
									const _enum = this.props.formContext.uiSchemaContext[enumField].oneOf;
									const enumValue = _enum.find(item => item.title === value).const;

									// Push enum value to changes.
									if (enumValue !== undefined) {
										!temp.includes(enumValue) && temp.push(enumValue);
										changes[field] = temp;
									}
								} else {
									changes[field] = join(changes[field], value);
								}
							});
						} else {
							changes[field] = getDefaultFormState(this.props.schema.properties[field]);
						}
					});
					success(() => {
						if (timestamp !== this.promiseTimestamp) return;
						if (this.mounted) {
							this.props.onChange({...(this.props.formData || {}), ...changes});
						} else {
							const pointer = this.props.formContext.services.ids.getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId(this.props.idSchema.$id, getFieldUUID(this.props));
							const newFormData = {...parseJSONPointer(lajiFormInstance.getFormData(), pointer), ...changes};
							lajiFormInstance.onChange(updateSafelyWithJSONPointer(lajiFormInstance.getFormData(), newFormData, pointer));
						}
						if (callback) callback();
					});
				};

				this.getComponentContext().fetching = true;

				this.props.formContext.setTimeout(() => {
					if (timestamp !== this.promiseTimestamp) return;
					if (this.getComponentContext().fetching) {
						fail(this.props.formContext.translations.GeocodingTimeout);
						this.mounted && this.setState({timeout: true}, () => {
							this.mounted && this.setState(this.getStateFromProps(this.props, false));
						});
					}
				}, 30 * 1000);

				
				this.props.formContext.apiClient.post("/coordinates/location", undefined, geometry).then(
					handleResponse("country", "municipality", "administrativeProvince", "biologicalProvince", "biogeographicalProvince")
				).catch(e => {
					fail(typeof e === "string" ? e : e.message);
				});
			}));
		};

		if (this.getComponentContext().hook) {
			this.props.formContext.services.submitHooks.remove(getFieldUUID(this.props), this.getComponentContext().hook).then(doAsync);
		} else {
			doAsync();
		}
	};

	render() {
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} uiSchema={this.state.uiSchema} />;
	}
}
