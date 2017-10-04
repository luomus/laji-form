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
						glyph: "map-marker",
						label: props.formContext.translations.ChooseFromNamedPlace
					}
				]
			}
		};

		return {uiSchema};
	}

	onPlaceSelected = (place) => {
		this.props.onChange([
			...(this.props.formData || []),
			getDefaultFormState(this.props.schema.items, place.prepopulatedDocument.gatherings[0], this.props.registry.definitions)
		]);
		this.setState({show: false});
		new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "activeIdx", this.props.formData.length);
	}

	render() {
		const {registry: {fields: {SchemaField}}, formContext} = this.props;
		const {uiSchema} = this.state;
		const onHide = () => this.setState({show: false});
		return (
			<div>
				<SchemaField  {...this.props} uiSchema={uiSchema} />
				{
					this.state.show ? (
						<Modal dialogClassName="laji-form map-dialog" show={true} onHide={onHide}>
							<Modal.Header closeButton={true}>
								{formContext.translations.ChooseNamedPlace}
							</Modal.Header>
							<Modal.Body>
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

	onEnumSelected = (idx) => {
		const {map} = this.mapElem;
		const layer = map._getDrawLayerById(map.idxsToIds[idx]);
		const latlng = layer.getLatLng();
		map.map.setView(latlng, {animate: false});
		map.setNormalizedZoom(15, {animate: false});
		new Context(this.props.formContext.contextId).setImmediate(() => layer.fire("click", {latlng}), 10);
	}

	onMapChange = (events) => {
		events.some(({type, idx}) => {
			if (type === "active") {
				this.setState({popupIdx: idx});
				return true;
			}
		});
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

		function getPopup(idx, feature, callback) {
			that.setState({popupIdx: idx});
			callback(findDOMNode(that.popupElem));
		}

		if (failed) {
			return <Alert bsStyle="danger">{`${translations.NamedPlacesFetchFail} ${translations.TryAgainLater}`}</Alert>;
		} else {
			const enums = (places || []).map((place, idx) => {
				return {value: idx, label: place.name};
			});

			return (
				<div style={{height: "100%"}}>
					<SelectWidget 
						disabled={!this.state.places}
						options={{enumOptions: enums, placeholder: `${translations.SelectPlaceFromList}...`}} 
						onChange={this.onEnumSelected} 
						schema={{}} 
						id="named-place-chooser-select" 
						formContext={this.props.formContext} />
					<Map 
						ref={getMapRef}
						draw={{
							data: {
								featureCollection: {
									type: "FeatureCollection", 
									features: (places || []).map(({geometry}) => {return {type: "Feature", geometry, properties: {}};})
								},
								getPopup: getPopup
							},
							editable: false,
							marker: false,
							hasActive: true,
							onChange: this.onMapChange
						}}
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
