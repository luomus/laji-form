import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import { getUiOptions, getInnerUiSchema, isEmptyString, dictionarify } from "../../utils";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
import { Modal, Alert } from "react-bootstrap";
import { Button } from "../components";
import Spinner from "react-spinner";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import { Map } from "./MapArrayField";
import { NORMAL_COLOR, ACTIVE_COLOR } from "laji-map/lib/globals";
import SelectWidget from "../widgets/SelectWidget";

const PLACES_FETCH_FAIL = "PLACES_FETCH_FAIL";
const PLACE_USE_FAIL = "PLACE_USE_FAIL";

/**
 * Compatible only with gatherings array and gathering object.
 */
@BaseComponent
export default class NamedPlaceChooserField extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.apiClient = new ApiClient();
	}

	isGatheringsArray = () => this.props.schema.type === "array"

	onPlaceSelected = (place) => {
		const getGathering = (schema) => {
			const whitelist = ["geometry", "country", "administrativeProvince", "biologicalProvince", "municipality", "locality", "localityDescription", "habitat", "habitatDescription"];
			let gathering = getDefaultFormState(schema, undefined, this.props.registry.definitions);
			const placeGathering = place.prepopulatedDocument.gatherings[0];
			whitelist.forEach(prop => {
				if (prop in placeGathering) {
					gathering[prop] = placeGathering[prop];
				}
			});
			gathering.namedPlaceID = place.id;
			return gathering;
		};

		try {
			let targetId, gathering, newFormData, zoomToData;
			if (this.isGatheringsArray()) {
				gathering = getGathering(this.props.schema.items);

				newFormData = [
					...(this.props.formData || []),
					gathering
				];
				this.setState({show: false});
				targetId = this.props.idSchema.$id;
				new Context(this.props.formContext.contextId).sendCustomEvent(targetId, "activeIdx", this.props.formData.length);
			} else { // gathering object
				gathering = getGathering(this.props.schema);
				gathering.namedPlaceID = place.id;

				newFormData = {...this.props.formData, ...gathering};
				this.setState({show: false});
				const splits = this.props.idSchema.$id.split("_");
				splits.pop();
				targetId = splits.join("_");
				zoomToData = true;
			}
			const {country} = gathering || {};
			// Sending the event triggers a state change, which may result in a race condition where the onChange event is lost.
			// That's why we use a callback here.
			if (!["Suomi", "Finland", "", undefined].includes(country)) {
				new Context(this.props.formContext.contextId).sendCustomEvent(targetId, "tileLayerName", "openStreetMap", () => {
					this.props.onChange(newFormData);
					if (zoomToData) new Context(this.props.formContext.contextId).sendCustomEvent(targetId, "zoomToData", undefined);
				});
			} else {
				this.props.onChange(newFormData);
				if (zoomToData) new Context(this.props.formContext.contextId).sendCustomEvent(targetId, "zoomToData", undefined);
			}
		} catch(e) {
			this.setState({failed: PLACE_USE_FAIL});
		}
	}

	onButtonClick = () => () => {
		this.setState({show: true});
	}

	updatePlaces = () => {
		this.apiClient.fetchCached("/named-places", {includePublic: false, pageSize: 1000}).then(response => {
			if (!this.mounted) return;
			const state = {places: response.results.sort((a, b) => {
				if (a.name < b.name) return -1;
				if (a.name > b.name) return 1;
				return 0;
			})};

			if (response.results && response.results.length) {
				const innerUiSchema = getInnerUiSchema(this.props.uiSchema);
				const options = getUiOptions(innerUiSchema);
				const buttonDefinition = {
					fn: this.onButtonClick,
					fnName: "addNamedPlace",
					glyph: "map-marker",
					label: this.props.formContext.translations.ChooseFromNamedPlace,
					id: this.props.idSchema.$id
				};
				if (this.isGatheringsArray()) {
					buttonDefinition.rules = {canAdd: true};
				} else {
					buttonDefinition.position = "top";
				}
				const uiSchema = {
					...innerUiSchema,
					"ui:options": {
						...options,
						buttons: [
							...(options.buttons || []),
							buttonDefinition
						]
					}
				};
				state.uiSchema = uiSchema;
			}

			this.setState(state);
		}).catch(() => {
			this.setState({failed: PLACES_FETCH_FAIL});
		});
	}

	componentDidMount() {
		this.mounted = true;
		this.updatePlaces();
		this.apiClient.onCachePathInvalidation("/named-places", this.updatePlaces);
	}

	componentWillUnmount() {
		this.mounted = false;
		this.apiClient.removeOnCachePathInvalidation("/named-places", this.updatePlaces);
	}

	render() {
		const {registry: {fields: {SchemaField}}, formContext} = this.props;
		const {translations} = formContext;
		const {failed} = this.state;
		const onHide = () => this.setState({show: false});
		return (
			<React.Fragment>
				<SchemaField  {...this.props} uiSchema={this.state.uiSchema || getInnerUiSchema(this.props.uiSchema)} />
				{
					this.state.show ? (
						<Modal dialogClassName="laji-form map-dialog" show={true} onHide={onHide}>
							<Modal.Header closeButton={true}>
								{translations.ChooseNamedPlace}
							</Modal.Header>
							<Modal.Body>
								{failed && <Alert bsStyle="danger">{translations.NamedPlacesUseFail}</Alert>}
								<NamedPlaceChooser places={this.state.places} failed={failed === PLACES_FETCH_FAIL ? true : false} formContext={formContext} onSelected={this.onPlaceSelected} />
							</Modal.Body>
						</Modal>
					) : null
				}
			</React.Fragment>
		);

	}
}

class NamedPlaceChooser extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	onPlaceSelected = (place) => {
		this.props.onSelected(place);
	}

	onSelectChange = (idx) => {
		const {map} = this.mapElem;
		const layers = this.idxToLayer[idx];
		const [layer] = layers;
		let center = undefined;
		if (layers.length === 1 && !layer.getBounds) {
			const latlng = layer.getLatLng ? layer.getLatLng() : layer.getCenter();
			center = latlng;
			if (map.data[0].groupContainer.hasLayer(layer) && map.data[0].groupContainer.zoomToShowLayer && layer.feature.geometry.type === "Point") {
				map.data[0].groupContainer.zoomToShowLayer(layer);
			} else {
				map.map.setView(latlng, 15, {animate: false});
			}
			map.setNormalizedZoom(15, {animate: false});
		} else {
			const layerGroup = L.featureGroup(layers); //eslint-disable-line no-undef
			center = layerGroup.getBounds().getCenter();
			map.map.fitBounds(layerGroup.getBounds(), {animate: false});
		}
		new Context(this.props.formContext.contextId).setImmediate(() => layer.fire("click", {latlng: center}), 10);
	}

	onMapChange = (events) => {
		events.some(({type, idx}) => {
			if (type === "active") {
				this.setState({popupIdx: idx});
				const {map} = this.mapElem;
				if (this.geometryCollectionData) {
					map.setData();
				}
				this.geometryCollectionData = {
					geoData: this.props.places[idx].geometry
				};
				map.setData(this.geometryCollectionData);
				return true;
			}
		});
	}

	componentDidUpdate(prevProps, prevState) {
		const {map} = this.mapElem;
		this.idxToLayer = map.data.reduce((idxToLayer, item) => {
			const layerGroup = item.group;
			layerGroup.eachLayer(layer => {
				if (!idxToLayer[layer.feature.properties.idx]) {
					idxToLayer[layer.feature.properties.idx] = [];
				}
				idxToLayer[layer.feature.properties.idx].push(layer);
			});
			return idxToLayer;
		}, {});

		if (this.state.popupIdx !== prevState.popupIdx) {
			const prevLayers = this.idxToLayer[prevState.popupIdx] || [];
			const layers = this.idxToLayer[this.state.popupIdx] || [];

			[prevLayers, layers].forEach(layers => {
				layers.forEach(layer => {
					if (layer) {
						map.setLayerStyle(layer, this.getFeatureStyle({feature: layer.feature}));
					}
				});
			});
		}
	}

	getFeatureStyle = (data) => {
		const {feature = {}} = data || {};
		function getColor(idx) {
			const r = NORMAL_COLOR.substring(1,3);
			const g = NORMAL_COLOR.substring(3,5);
			const b = NORMAL_COLOR.substring(5,7);
			return [r, g, b].reduce((rgb, hex) => {
				const decimal = parseInt(hex, 16);
				const amount = 40;
				const _decimal = (idx % 2) ? decimal : Math.min(decimal + amount, 255);
				return rgb + _decimal.toString(16);
			}, "#");
		}

		const {idx} = feature.properties || {};
		const color = idx === this.state.popupIdx ? ACTIVE_COLOR : getColor(idx);
		return {color, fillColor: color};
	}

	render() {
		const {places, failed, formContext: {translations}} = this.props;
		
		const that = this;
		function getPopupRef(elem) {
			that.popupElem = elem;
		}
		function getMapRef(elem) {
			that.mapElem = elem;
		}

		function getPopup(_idx, feature, callback) {
			const {idx} = feature.properties;
			that.setState({popupIdx: idx});
			callback(findDOMNode(that.popupElem));
		}

		if (failed) {
			return <Alert bsStyle="danger">{`${translations.NamedPlacesFetchFail} ${translations.TryAgainLater}`}</Alert>;
		} else {
			const enums = (places || []).map((place, idx) => {
				return {value: idx, label: place.name};
			});
			let pointer = 1;
			const data = (places || []).reduce((data, place, i) => {
				const {geometry}  = place;
				let isCollection = false;
				if (geometry.type === "GeometryCollection") {
					isCollection = true;
				}
				if (isCollection) {
					data[pointer] = {
						geoData: {type: "FeatureCollection", features: geometry.geometries.map(geom => {return {type: "Feature", geometry: geom, properties: {idx: i}};})},
						getFeatureStyle: this.getFeatureStyle,
						getPopup,
						highlightOnHover: true
					};
					pointer++;
				} else {
					if (!data[0]) data[0] = {
						geoData: {type: "FeatureCollection", features: []},
						getFeatureStyle: this.getFeatureStyle,
						getPopup,
						cluster: true,
						highlightOnHover: true
					};
					data[0].geoData.features.push({type: "Feature", geometry, properties: {idx: i}});
				}
				return data;
			}, []);

			return (
				<div style={{height: "inherit"}}>
					<SelectWidget 
						disabled={!places}
						options={{enumOptions: enums, placeholder: `${translations.SelectPlaceFromList}...`}} 
						onChange={this.onSelectChange} 
						selectOnChange={false}
						schema={{}} 
						id="named-place-chooser-select" 
						formContext={this.props.formContext} />
					<Map 
						ref={getMapRef}
						data={data}
						markerPopupOffset={45}
						featurePopupOffset={5}
						controls={{draw: false}}
						lang={this.props.formContext.lang}
						bodyAsDialogRoot={false}
					/>
					{(!places) ? <Spinner /> : null}
					<div style={{display: "none"}}>
						<Popup ref={getPopupRef} 
							place={(places || [])[this.state.popupIdx]} 
							onPlaceSelected={this.onPlaceSelected}
							contextId={this.props.formContext.contextId}
							translations={translations} />
					</div>
			</div>
			);
		}
	}
}

class Popup extends Component {
	_onPlaceSelected = () => {
		this.props.onPlaceSelected(this.props.place);
	}

	componentDidUpdate() {
		new Context(this.props.contextId).setImmediate(() => {
			if (this.buttonElem) findDOMNode(this.buttonElem).focus();
		});
	}

	getButtonRef = (elem) => {
		this.buttonElem = elem;
		console.log(this.buttonElem);
		console.log(findDOMNode(this.buttonElem));
	}

	render() {
		const {place, translations} = this.props;

		return place ? (
			<div>
				<table className="named-place-popup">
					<tbody>
					{
						[
							["Name", "name"], 
							["Notes", "notes"]
						].reduce((fieldset, [translationKey, fieldName], i) => {
							if (!isEmptyString(place[fieldName])) fieldset.push(
								<tr key={i}>
									<td><b>{translations[translationKey]}: </b></td>
									<td>{place[fieldName]}</td>
								</tr>
							);
							return fieldset;
						}, [])
					}
				</tbody>
				</table>
				<Button ref={this.getButtonRef} onClick={this._onPlaceSelected}>{translations.UseThisPlace}</Button>
		</div>
		) : <Spinner />;
	}
}

new Context("SCHEMA_FIELD_WRAPPERS").NamedPlaceChooserField = true;
