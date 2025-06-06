import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import { getUiOptions, getInnerUiSchema, isEmptyString, addLajiFormIds, getDefaultFormState } from "../../utils";
import { Button, DeleteButton } from "../components";
import Spinner from "react-spinner";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";
import BaseComponent from "../BaseComponent";
import { Map } from "./MapArrayField";
import { NORMAL_COLOR, ACTIVE_COLOR } from "@luomus/laji-map/lib/globals";
import SelectWidget from "../widgets/SelectWidget";

const PLACES_FETCH_FAIL = "PLACES_FETCH_FAIL";
const PLACE_USE_FAIL = "PLACE_USE_FAIL";
const PLACE_DELETE_FAIL = "PLACE_DELETE_FAIL";

/**
 * Compatible only with gatherings array and gathering object.
 */
@BaseComponent
export default class NamedPlaceChooserField extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object", "array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
	}

	constructor(props) {
		super(props);
		this.apiClient = props.formContext.apiClient;
		this.removeIds = {};
	}

	getStateFromProps(props) {
		return {uiSchema: this.getUiSchema(props)};
	}

	getUiSchema = (props) => {
		if (this.buttonDefinition) {
			this.buttonDefinition = {
				...this.buttonDefinition,
				label: props.formContext.translations.ChooseFromNamedPlace
			};
			const innerUiSchema = getInnerUiSchema(props.uiSchema);
			const options = getUiOptions(innerUiSchema);
			return {
				...innerUiSchema,
				"ui:options": {
					...options,
					buttons: [
						this.buttonDefinition,
						...(options.buttons || [])
					]
				}
			};
		} else {
			return getInnerUiSchema(props.uiSchema);
		}
	}

	isGatheringsArray = () => this.props.schema.type === "array"

	onPlaceSelected = (place) => {
		const getGathering = (schema) => {
			const whitelist = ["geometry", "country", "administrativeProvince", "biologicalProvince", "municipality", "locality", "localityDescription", "habitat", "habitatDescription"];
			let gathering = getDefaultFormState(schema);
			const placeGathering = place.prepopulatedDocument.gatherings[0];
			whitelist.forEach(prop => {
				if (prop in placeGathering && prop in schema.properties) {
					gathering[prop] = placeGathering[prop];
				}
			});
			gathering.namedPlaceID = place.id;
			const tmpIdTree = this.props.formContext.services.ids.getRelativeTmpIdTree(this.props.idSchema.$id);

			const [withLajiFormIds] = addLajiFormIds(gathering, tmpIdTree, false);
			return withLajiFormIds;
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
				this.props.formContext.services.customEvents.send(targetId, "activeIdx", (this.props.formData || []).length);
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
			this.props.onChange(newFormData);
			if (zoomToData) this.props.formContext.services.customEvents.send(targetId, "zoomToData", undefined);
		} catch (e) {
			this.setState({failed: PLACE_USE_FAIL});
		}
	}

	onPlaceDeleted = (place, success) => {
		this.apiClient.fetchRaw(`/named-places/${place.id}`, undefined, {method: "DELETE"}).then(response => {
			if (response.status < 400) {
				// It takes a while for API to remove the place, so we remove it locally and then invalidate again after some time.
				this.removeIds[place.id] = true;
				this.apiClient.invalidateCachePath("/named-places");
				setTimeout(() => this.apiClient.invalidateCachePath("/named-places"), 2000);
				success();
			}
		}).catch(() => {
			this.setState({failed: PLACE_DELETE_FAIL});
			this.props.formContext.notifier.error(this.props.formContext.translations.PlaceRemovalFailed);
		});
	}

	onButtonClick = () => () => {
		this.setState({show: true});
	}

	updatePlaces = () => {
		this.buttonDefinition = undefined;
		this.apiClient.fetchCached("/named-places", {includePublic: false, pageSize: 100000}).then(response => {
			if (!this.mounted) return;
			const state = {places: response.results.filter(p => !this.removeIds[p.id]).sort((a, b) => {
				if (a.name < b.name) return -1;
				if (a.name > b.name) return 1;
				return 0;
			})};

			if (response.results && response.results.length) {
				this.buttonDefinition = {
					fn: this.onButtonClick,
					fnName: "addNamedPlace",
					glyph: "map-marker",
					label: this.props.formContext.translations.ChooseFromNamedPlace,
					id: this.props.idSchema.$id,
					changesFormData: true,
					variant: "primary"
				};
				if (this.isGatheringsArray()) {
					this.buttonDefinition.rules = {canAdd: true};
				} else {
					this.buttonDefinition.position = "top";
				}
				const uiSchema = this.getUiSchema(this.props);
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

	onHide = () => this.setState({show: false});

	render() {
		const {registry: {fields: {SchemaField}}, formContext} = this.props;
		const {translations} = formContext;
		const {failed} = this.state;
		const {Modal, Alert} = this.context.theme;
		return (
			<React.Fragment>
				<SchemaField  {...this.props} uiSchema={this.state.uiSchema} />
				{
					this.state.show ? (
						<Modal dialogClassName="laji-form map-dialog named-place-chooser-modal" show={true} onHide={this.onHide}>
							<Modal.Header closeButton={true}>
								{translations.ChooseNamedPlace}
							</Modal.Header>
							<Modal.Body>
								{failed === PLACE_USE_FAIL && <Alert variant="danger">{translations.NamedPlacesUseFail}</Alert>}
								{failed === PLACES_FETCH_FAIL && <Alert variant="danger">{translations.NamedPlacesFetchFail}</Alert>}
								<NamedPlaceChooser places={this.state.places} failed={failed === PLACES_FETCH_FAIL ? true : false} formContext={formContext} onSelected={this.onPlaceSelected} onDeleted={this.onPlaceDeleted} />
							</Modal.Body>
						</Modal>
					) : null
				}
			</React.Fragment>
		);

	}
}

class NamedPlaceChooser extends React.Component {
	static contextType = ReactContext;
	constructor(props) {
		super(props);
		this.state = {};
	}

	onPlaceSelected = (place) => {
		this.props.onSelected(place);
	}

	onPlaceDeleted = (place) => {
		const onDelete = () => {
			if (this.popupContainerElem && this.popupElem) {
				this.popupContainerElem.appendChild(findDOMNode(this.popupElem));
			}
			this.mapElem.map.map.closePopup();
			this.setState({deleting: false, popupIdx: undefined});
		};
		this.setState({deleting: true});
		this.props.onDeleted(place, onDelete);
	}

	onSelectChange = (idx) => {
		if (idx === undefined) {
			return;
		}
		const {map} = this.mapElem;
		const layers = this.idxToLayer[idx];
		const [layer] = layers;
		const bounds = map.getBoundsForLayers(layers);
		const center = bounds.getCenter();
		map.fitBounds(bounds, {animate: false});
		this.props.formContext.setTimeout(() => layer.fire("click", {latlng: center}), 10);
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

	setPopupContainerRef = (elem) => {
		this.popupContainerElem = elem;
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

		function getPopup({feature}, callback) {
			const {idx} = feature.properties;
			that.setState({popupIdx: idx});
			callback(findDOMNode(that.popupElem));
		}

		const {Alert} = this.context.theme;
		if (failed) {
			return <Alert variant="danger">{`${translations.NamedPlacesFetchFail} ${translations.TryAgainLater}`}</Alert>;
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
						includeEmpty={true} 
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
						formContext={this.props.formContext}
					/>
					{(!places) ? <Spinner /> : null}
					<div style={{display: "none"}} ref={this.setPopupContainerRef}>
						<Popup ref={getPopupRef} 
							place={(places || [])[this.state.popupIdx]} 
							onPlaceSelected={this.onPlaceSelected}
							onPlaceDeleted={this.onPlaceDeleted}
							deleting={this.state.deleting}
							formContext={this.props.formContext}
							translations={translations} />
					</div>
				</div>
			);
		}
	}
}

class Popup extends React.Component {
	_onPlaceSelected = () => {
		this.props.onPlaceSelected(this.props.place);
	}
	_onPlaceDeleted = () => {
		this.props.onPlaceDeleted(this.props.place);
	}

	componentDidUpdate() {
		this.props.formContext.setTimeout(() => {
			if (this.buttonElem) findDOMNode(this.buttonElem).focus();
		});
	}

	getButtonRef = (elem) => {
		this.buttonElem = elem;
	}

	render() {
		const {place, translations, deleting} = this.props;

		return place ? (
			<div className="named-place-popup">
				<table>
					<tbody>{
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
					}</tbody>
				</table>
				<Button block ref={this.getButtonRef} onClick={this._onPlaceSelected}>{translations.UseThisPlace}</Button>
				<DeleteButton block
				              onClick={this._onPlaceDeleted}
				              disabled={deleting}
				              glyphButton={false}
				              confirm={true}
				              confirmStyle={"browser"}
				              translations={translations}>
					{translations.Remove} {deleting && <Spinner />}
				</DeleteButton>
			</div>
		) : <Spinner />;
	}
}

getContext("SCHEMA_FIELD_WRAPPERS").NamedPlaceChooserField = true;
