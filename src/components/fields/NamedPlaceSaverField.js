import React, { Component } from "react";
import { getInnerUiSchema } from "../../utils";
import { Modal, Alert, ListGroup, ListGroupItem, Panel, Form, FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import { GlyphButton, Button } from "../components";
import ApiClient from "../../ApiClient";
import Context from "../../Context";
import BaseComponent from "../BaseComponent";

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
			"ui:buttons": [
				...(innerUiSchema["ui:buttons"] || []),
				this.getButton(props)
			]
		};

		return {uiSchema};
	}

	getButton(props) {
		const button = (
			<GlyphButton 
				bsStyle={props.formData.namedPlaceID ? "success" : "default"} 
				key="named-place-save-button" 
				glyph="floppy-disk" 
				tooltip={props.formContext.translations.SaveNamedPlace}
				onClick={this.onButtonClick} />
		);

		return button;
	}

	onButtonClick = () => {
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
					<Modal.Body>
						<PlaceSaverDialog formContext={formContext} value={this.props.formData.locality} onSave={this.onSave} gathering={this.props.formData} />
					</Modal.Body>
				</Modal>) : null}
			</div>
		);
	}
}

class PlaceSaverDialog extends Component {
	constructor(props) {
		super(props);
		this.state = {value: props.value || ""};
		this.apiClient = new ApiClient();
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentDidMount() {
		this.mounted = true;

		this.apiClient.fetch("/named-places", {collectionID: this.props.formContext.uiSchemaContext.formID}).then(response => {
			if (!this.mounted) return;
			this.setState({
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
			});
		}).catch(() => {
			this.setState({failed: FETCH});
		});
	}

	onInputChange = ({target: {value}}) => {
		this.setState({value});
	}

	getGathering = () => {
		const {units, dateBegin, dateEnd, weather, namedPlaceID, ...gathering} = this.props.gathering; //eslint-disable-line no-unused-vars
		return gathering;
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

	render() {
		const {value, placeNamesToPlaces = {}} = this.state;
		const {translations} = this.props.formContext;
		const existingPlaces = (placeNamesToPlaces[value] || []).filter(place => {
			return (place.owners || []).includes(this.props.formContext.uiSchemaContext.creator);
		});

		// Hack that fixed autofocus cursor position
		function onFocus(e) {
			var val = e.target.value;
			e.target.value = "";
			e.target.value = val;
		}

		function onSubmit(e) {
			e.preventDefault();
		}

		return this.state.failed ? (
			<Alert bsStyle="danger">{`${translations[`NamedPlaces${this.state.failed === FETCH ? "Fetch" : "Save"}Fail`]} ${translations.TryAgainLater}`}</Alert> 
		): (
		<div className="place-saver-dialog">
			<Form inline onSubmit={onSubmit}>
				<FormGroup>
					<ControlLabel>{translations.Name}: </ControlLabel>
					{" "}
					<FormControl type="text" value={value} onChange={this.onInputChange} autoFocus onFocus={onFocus}/>
					{" "}
					<Button bsSize="small" onClick={this.onSaveNew}>{translations.Save} {translations.new}</Button>
					{" "}
					{!existingPlaces.length && this.props.gathering.namedPlaceID ? 
							<Button  bsSize="small" onClick={this.onOverwriteCurrent}>{translations.SaveOverwrite}</Button> : 
							null
					}
				</FormGroup>
			</Form>
			{existingPlaces.length ? (
				<FormGroup>
					<Alert bsStyle="warning">{`${translations.Warning}: ${translations.UsedNamedPlaceName}`}</Alert>
					<Panel header={translations.ClickPlaceToOverwrite}>
						<ListGroup fill>
							{existingPlaces.map(place => 
								<ListGroupItem header={place.name} key={place.id} onClick={this.onOverwriteSelected(place)}>
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
