import React, { Component } from "react";
import { findDOMNode }  from "react-dom";
import { getInnerUiSchema, isEmptyString, getUiOptions } from "../../utils";
import { Modal, Alert, ListGroup, ListGroupItem, Panel, Form, FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import { Button } from "../components";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";
import Spinner from "react-spinner";

const SAVE = "SAVE", FETCH = "FETCH";

/**
 * Compatible only with gathering field.
 */
@BaseComponent
export default class NamedPlaceSaverField extends Component {
	getStateFromProps(props) {
		const innerUiSchema = getInnerUiSchema(props.uiSchema);
		const uiSchema = {
			...innerUiSchema,
			"ui:options": {
				...getUiOptions(innerUiSchema),
				buttons: [
					...(getUiOptions(innerUiSchema).buttons || []),
					this.getButton(props)
				]
			}
		};

		return {uiSchema};
	}

	getButton(props) {
		return {
			label: props.formContext.translations.SaveNamedPlace,
			fn: this.onButtonClick,
			glyph: "floppy-disk",
			position: "top"
		};
	}

	onButtonClick = () => () => {
		this.setState({show: !this.state.show});
	}

	onSave = (place) => {
		this.setState({show: false}, () => {
			this.props.onChange({...this.props.formData, namedPlaceID: place.id});
		});
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.show !== this.state.show) this.setState(this.getStateFromProps(this.props));
	}

	render() {
		const {registry: {fields: {SchemaField}}, formContext} = this.props;
		const {uiSchema} = this.state;
		const onHide = () => this.setState({show: false});
		return (
			<div>
				<SchemaField  {...this.props} uiSchema={uiSchema} />
				{this.state && this.state.show ? (
				<Modal dialogClassName="laji-form" show={true} onHide={onHide}>
					<Modal.Header>
						<Modal.Title>{formContext.translations.NamedPlaces}</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<PlaceSaverDialog formContext={formContext} onSave={this.onSave} gathering={this.props.formData} />
					</Modal.Body>
				</Modal>) : null}
			</div>
		);
	}
}

class PlaceSaverDialog extends Component {
	constructor(props) {
		super(props);
		const {namedPlaceID, locality = ""} = props.gathering;
		this.state = {value: locality};
		if (namedPlaceID) {
			this.state = {value: "", loading: true};
		}
		this.apiClient = new ApiClient();
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentDidMount() {
		this.mounted = true;

		this.apiClient.fetch("/named-places", {includePublic: false}).then(response => {
			if (!this.mounted) return;
			const state = {
				places: response.results,
				placeIdsToPlaces: response.results.reduce((idsToPlaces, place) => {
					idsToPlaces[place.id] = place;
					return idsToPlaces;
				}, {}),
				placeNamesToPlaces: response.results.reduce((namesToPlaces, place) => {
					if (!namesToPlaces[place.name]) namesToPlaces[place.name] = [];
					namesToPlaces[place.name].push(place);
					return namesToPlaces;
				}, {})
			};

			const {namedPlaceID} = this.props.gathering;
			if (namedPlaceID) {
				state.value = state.placeIdsToPlaces[namedPlaceID].name;
				state.loading = false;
			}

			this.setState(state, () => {
				if (namedPlaceID) {
					findDOMNode(this.inputRef).focus();
				}
			});
		}).catch(() => {
			this.setState({failed: FETCH});
		});
	}

	onInputChange = ({target: {value}}) => {
		this.setState({value});
	}

	getGathering = () => {
		return ["geometry", "country", "administrativeProvince", "biologicalProvince", "municipality", "locality", "localityDescription", "habitat", "habitatDescription", "coordinateRadius"].reduce((gathering, key) => {
			gathering[key] = this.props.gathering[key];
			return gathering;
		}, {});
	}

	onSave(place) {
		place = {
			...place,
			geometry: place.prepopulatedDocument.gatherings[0].geometry,
			collectionID: this.props.formContext.uiSchemaContext.formID
		};

		this.apiClient.fetchRaw(`/named-places${place.id ? `/${place.id}` : ""}`, undefined, {
			method: place.id ? "PUT" : "POST",
			headers: {
				"accept": "application/json",
				"content-type": "application/json"
			},
			body: JSON.stringify(place)
		}).then(response => {
			this.apiClient.invalidateCachePath("/named-places");
			return response.json();
		}).then(this.props.onSave)
			.catch(() => {
				this.setState({failed: SAVE});
			});
	}

	onSaveNew = (e) => {
		e.preventDefault();
		const {namedPlaceID, ...gathering} = this.getGathering(); //eslint-disable-line no-unused-vars
		this.onSave({
			name: this.state.value,
			prepopulatedDocument: {gatherings: [gathering]}
		});
	}

	onOverwriteCurrent = () => {
		const {namedPlaceID} = this.props.gathering;
		const gathering = this.getGathering(); //eslint-disable-line no-unused-vars
		this.onSave({
			...this.state.placeIdsToPlaces[namedPlaceID],
			name: this.state.value,
			prepopulatedDocument: {gatherings: [gathering]}
		});
	}
	
	onOverwriteSelected = (place) => () => {
		const gathering = this.getGathering(); //eslint-disable-line no-unused-vars
		this.onSave({
			...place,
			name: this.state.value,
			prepopulatedDocument: {gatherings: [gathering]}
		});
	}

	onOverwriteExisting = () => {
		this.onOverwriteSelected(this.state.placeNamesToPlaces[this.state.value])();
	}

	// Hack that fixed autofocus cursor position
	onFocus = (e) => {
		var val = e.target.value;
		e.target.value = "";
		e.target.value = val;
	}

	onSubmit = (e) => {
		e.preventDefault();
	}

	setInputRef = (elem) => {
		this.inputRef = elem;
	}

	render() {
		const {value, placeNamesToPlaces = {}, loading} = this.state;
		const {translations} = this.props.formContext;
		const existingPlaces = (placeNamesToPlaces[value] || []).filter(place => {
			return (place.owners || []).includes(this.props.formContext.uiSchemaContext.creator);
		});

		const getButton = (onClick, text) => {
			return <Button bsSize="small" onClick={onClick} disabled={loading || isEmptyString(value)}>{text}</Button>;
		};

		return this.state.failed ? (
			<Alert bsStyle="danger">{`${translations[`NamedPlaces${this.state.failed === FETCH ? "Fetch" : "Save"}Fail`]} ${translations.TryAgainLater}`}</Alert> 
		): (
			<div className="place-saver-dialog">
				<Form inline onSubmit={this.onSubmit}>
					<FormGroup>
						<ControlLabel>{translations.Name}: </ControlLabel>
						{" "}
						<FormControl type="text" value={value} onChange={this.onInputChange} autoFocus onFocus={this.onFocus} disabled={loading} ref={this.setInputRef}/>
						{" "}
						{!existingPlaces.length ? 
								getButton(this.onSaveNew, `${translations.Save} ${translations.new}`) : null}
						{" "}
						{this.props.gathering.namedPlaceID ? 
								getButton(this.onOverwriteCurrent, translations.SaveCurrentOverwrite) : null}
						{existingPlaces.length === 1 && !this.props.gathering.namedPlaceID ? 
								getButton(this.onOverwriteExisting, translations.SaveExistingOverwrite) : null}
					</FormGroup>
					{loading ? <div className="pull-right"><Spinner /></div> : null}
				</Form>
				{!this.props.gathering.namedPlaceID && existingPlaces.length ?
					<Alert bsStyle="warning">{`${translations.Warning}: ${translations.UsedNamedPlaceName}.${existingPlaces.length > 1 ? ` ${translations.UsedNamedPlaceNameMultiple} ${translations.or} ${translations.saveCurrentOverwrite}.` : ""}`}</Alert>
					: null}
				{existingPlaces.length > 1 ? (
					<FormGroup>
						<Panel header={translations.ClickPlaceToOverwrite}>
							<ListGroup fill>
								{existingPlaces.map(place =>
									<ListGroupItem header={place.name} key={place.id} onClick={loading ? undefined : this.onOverwriteSelected(place)} disabled={loading}>
										{place.notes}
									</ListGroupItem>
								)}
							</ListGroup>
						</Panel>
					</FormGroup>
				) : null}
			</div>
		);
	}
}

new Context("SCHEMA_FIELD_WRAPPERS").NamedPlaceSaverField = true;
