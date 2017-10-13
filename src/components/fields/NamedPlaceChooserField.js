import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import { getUiOptions, getInnerUiSchema, isEmptyString } from "../../utils";
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

/**
 * Compatible only with gathering field.
 */
@BaseComponent
export default class NamedPlaceChooserField extends Component {
	getStateFromProps(props) {
		const innerUiSchema = getInnerUiSchema(props.uiSchema);
		const options = getUiOptions(innerUiSchema);
		const uiSchema = {
			...innerUiSchema,
			"ui:options": {
				...options,
				buttons: [
					...(options.buttons || []),
					{
						fn: () => () => {
							this.setState({show: true});
						},
						key: "addNamedPlace",
						glyph: "map-marker",
						label: props.formContext.translations.ChooseFromNamedPlace,
						rules: {
							canAdd: true
						}
					}
				]
			}
		};

		return {uiSchema};
	}

	onPlaceSelected = (place) => {
		try {
			this.props.onChange([
				...(this.props.formData || []),
				getDefaultFormState(this.props.schema.items, place.prepopulatedDocument.gatherings[0], this.props.registry.definitions)
			]);
			this.setState({show: false});
			new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "activeIdx", this.props.formData.length);
		} catch(e) {
			this.setState({failed: true});
		}
	}

	render() {
		const {registry: {fields: {SchemaField}}, formContext} = this.props;
		const {translations} = formContext;
		const {uiSchema, failed} = this.state;
		const onHide = () => this.setState({show: false});
		return (
			<div>
				<SchemaField  {...this.props} uiSchema={uiSchema} />
				{
					this.state.show ? (
						<Modal dialogClassName="laji-form map-dialog" show={true} onHide={onHide}>
							<Modal.Header closeButton={true}>
								{translations.ChooseNamedPlace}
							</Modal.Header>
							<Modal.Body>
								{failed && <Alert bsStyle="danger">{translations.NamedPlacesUseFail}</Alert>}
								<NamedPlaceChooser formContext={formContext} onSelected={this.onPlaceSelected} />
							</Modal.Body>
						</Modal>
					) : null
				}
			</div>
		);

	}
}

class NamedPlaceChooser extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.apiClient = new ApiClient();
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentDidMount() {
		this.mounted = true;
		this.apiClient.fetch("/named-places", {collectionID: this.props.formContext.uiSchemaContext.formID}).then(response => {
			if (!this.mounted) return;
			this.setState({places: response.results});
		}).catch(() => {
			this.setState({failed: true});
		});
	}

	onPlaceSelected = (place) => {
		this.props.onSelected(place);
	}

	onSelectChange = (idx) => {
		const {map} = this.mapElem;
		const layers = this.idxToLayer[idx];
		let center = undefined;
		if (layers.length === 1) {
			const latlng = layers[0].getLatLng();
			center = latlng;
			if (map.data[0].clusterLayer.hasLayer(layers[0])) {
				map.data[0].clusterLayer.zoomToShowLayer(layers[0]);
			} else {
				map.map.setView(latlng, {animate: false});
			}
		} else {
			const layerGroup = L.featureGroup(layers);
			center = layerGroup.getBounds().getCenter();
			map.map.fitBounds(layerGroup.getBounds(), {animate: false});
		}
		map.setNormalizedZoom(15, {animate: false});
		new Context(this.props.formContext.contextId).setImmediate(() => layers[0].fire("click", {latlng: center}), 10);
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
					geoData: this.state.places[idx].geometry
				};
				map.setData(this.geometryCollectionData);
				return true;
			}
		});
	}

	componentDidUpdate(prevProps, prevState) {
		const {map} = this.mapElem;
		const idxToLayer = map.dataLayerGroups.reduce((idxToLayer, layerGroup) => {
			layerGroup.eachLayer(layer => {
				if (!idxToLayer[layer.feature.properties.idx]) {
					idxToLayer[layer.feature.properties.idx] = [];
				}
				idxToLayer[layer.feature.properties.idx].push(layer);
			});
			return idxToLayer;
		}, {});
		this.idxToLayer = idxToLayer;

		if (this.state.popupIdx !== prevState.popupIdx) {
			const prevLayers = this.idxToLayer[prevState.popupIdx] || [];
			const layers = this.idxToLayer[this.state.popupIdx] || [];

			[prevLayers, layers].forEach(layers => {
				layers.forEach(layer => {
					if (layer) {
						map.updateLayerStyle(layer, this.getFeatureStyle({feature: layer.feature}));
					}
				});
			});
		}
	}

	getFeatureStyle = ({feature}) => {
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

		const {idx} = feature.properties;
		return {color: idx === this.state.popupIdx ? ACTIVE_COLOR : getColor(idx)};
	}

	render() {
		const {places, failed} = this.state;
		const {translations} = this.props.formContext;
		
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
						getPopup
					};
					pointer++;
				} else {
					if (!data[0]) data[0] = {
						geoData: {type: "FeatureCollection", features: []},
						getFeatureStyle: this.getFeatureStyle,
						getPopup,
						cluster: true
					};
					data[0].geoData.features.push({type: "Feature", geometry, properties: {idx: i}});
				}
				return data;
			}, []);

			return (
				<div style={{height: "100%"}}>
					<SelectWidget 
						disabled={!this.state.places}
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
						controlSettings={{draw: false, coordinateInput: false}}
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

	render() {
		const {place, translations} = this.props;

		const that = this;
		function getButtonRef(elem) {
			that.buttonElem = elem;
		}

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
				<Button ref={getButtonRef} onClick={this._onPlaceSelected}>{translations.UseThisPlace}</Button>
		</div>
		) : <Spinner />;
	}
}

new Context("SCHEMA_FIELD_WRAPPERS").NamedPlaceChooserField = true;
