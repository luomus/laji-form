import * as React from "react";
import { findDOMNode }  from "react-dom";
import * as PropTypes from "prop-types";
import { getInnerUiSchema, isEmptyString, getUiOptions } from "../../utils";
import { Button } from "../components";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";
import Spinner from "react-spinner";
import { parseGeometries } from "./MapArrayField";
import memoize from "memoizee";

const SAVE = "SAVE", FETCH = "FETCH";

/**
 * Compatible only with gathering field.
 */
export default class NamedPlaceSaverField extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
	};

	state = { show: false };

	getUiSchema(props) {
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

		return uiSchema;
	}

	getButton(props) {
		return {
			label: props.formContext.translations.SaveNamedPlace,
			fn: this.onButtonClick,
			glyph: "floppy-disk",
			position: "top",
			disabled: !parseGeometries((props.formData || {}).geometry).length
		};
	}

	onButtonClick = () => () => {
		this.setState({show: !this.state.show});
	};

	onSave = (place) => {
		this.setState({show: false}, () => {
			this.props.onChange({...(this.props.formData || {}), namedPlaceID: place.id});
		});
	};

	onHide = () => this.setState({show: false});

	render() {
		const {registry: {fields: {SchemaField}}, formContext} = this.props;
		const {Modal} = this.context.theme;
		const uiSchema = this.getUiSchema(this.props)
		return (
			<div>
				<SchemaField  {...this.props} uiSchema={uiSchema} />
				{this.state && this.state.show
					? (
						<Modal dialogClassName="laji-form" show={true} onHide={this.onHide}>
							<Modal.Header>
								<Modal.Title>{formContext.translations.NamedPlaces}</Modal.Title>
							</Modal.Header>
							<Modal.Body>
								<PlaceSaverDialog formContext={formContext} onSave={this.onSave} gathering={this.props.formData || {}} />
							</Modal.Body>
						</Modal>
					) : null}
			</div>
		);
	}
}

class PlaceSaverDialog extends React.Component {
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		const {namedPlaceID, locality = ""} = props.gathering;
		this.state = {value: locality};
		if (namedPlaceID) {
			this.state = {value: "", loading: true};
		}
		this.apiClient = props.formContext.apiClient;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentDidMount() {
		this.mounted = true;

		this.apiClient.get("/named-places", { query: { includePublic: false, pageSize: 100000 } }).then(response => {
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
	};

	getGathering = () => {
		return ["geometry", "country", "administrativeProvince", "biologicalProvince", "municipality", "locality", "localityDescription", "habitat", "habitatDescription", "coordinateRadius"].reduce((gathering, key) => {
			gathering[key] = this.props.gathering[key];
			return gathering;
		}, {});
	};

	async onSave(place) {
		place = {
			...place,
			geometry: place.prepopulatedDocument.gatherings[0].geometry
		};

		this.props.formContext.services.blocker.push();
		try {
			const savedPlace = await this.apiClient[place.id ? "put" : "post"](
				`/named-places${place.id ? "/{id}" : ""}`,
				place.id ? { path: { id: place.id } } : undefined,
				place
			);
			this.props.formContext.services.blocker.pop();
			await this.props.onSave(savedPlace);
		} catch (e) {
			this.props.formContext.services.blocker.pop();
			this.setState({failed: SAVE});
		}
	}

	onSaveNew = (e) => {
		e.preventDefault();
		const {namedPlaceID, ...gathering} = this.getGathering();  
		this.onSave({
			name: this.state.value,
			prepopulatedDocument: {gatherings: [gathering]}
		});
	};

	onOverwriteCurrentFor = memoize((namedPlaceID) => () => {
		const gathering = this.getGathering();  
		this.onSave({
			...this.state.placeIdsToPlaces[namedPlaceID],
			name: this.state.value,
			prepopulatedDocument: {gatherings: [gathering]}
		});
	});
	
	onOverwriteSelected = memoize((place) => () => {
		const gathering = this.getGathering();  
		this.onSave({
			...place,
			name: this.state.value,
			prepopulatedDocument: {gatherings: [gathering]}
		});
	});

	onOverwriteExistingFor = memoize((place) => () => {
		this.onOverwriteSelected(place)();
	});

	// Hack that fixed autofocus cursor position
	onFocus = (e) => {
		var val = e.target.value;
		e.target.value = "";
		e.target.value = val;
	};

	onSubmit = (e) => {
		e.preventDefault();
	};

	setInputRef = (elem) => {
		this.inputRef = elem;
	};

	render() {
		const {value, placeNamesToPlaces = {}, loading} = this.state;
		const {translations} = this.props.formContext;
		const existingPlaces = (placeNamesToPlaces[value] || []).filter(place => {
			return (place.owners || []).includes(this.props.formContext.uiSchemaContext.creator);
		});

		const getButton = (onClick, text) => {
			return <Button small onClick={onClick} disabled={loading || isEmptyString(value)}>{text}</Button>;
		};

		const {Panel, FormGroup, FormControl, ListGroup, ListGroupItem, Alert, Form, ControlLabel} = this.context.theme;
		return this.state.failed ? (
			<Alert variant="danger">{`${translations[`NamedPlaces${this.state.failed === FETCH ? "Fetch" : "Save"}Fail`]} ${translations.TryAgainLater}`}</Alert> 
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
							getButton(this.onOverwriteCurrentFor(this.props.gathering.namedPlaceID), translations.SaveCurrentOverwrite) : null}
						{existingPlaces.length === 1 && !this.props.gathering.namedPlaceID ? 
							getButton(this.onOverwriteExistingFor(existingPlaces[0]), translations.SaveExistingOverwrite) : null}
					</FormGroup>
					{loading ? <div className="pull-right"><Spinner /></div> : null}
				</Form>
				{!this.props.gathering.namedPlaceID && existingPlaces.length ?
					<Alert variant="warning">{`${translations.Warning}: ${translations.UsedNamedPlaceName}.${existingPlaces.length > 1 ? ` ${translations.UsedNamedPlaceNameMultiple}.` : ""}`}</Alert>
					: null}
				{existingPlaces.length > 1 ? (
					<FormGroup>
						<Panel>
							<Panel.Heading>{translations.ClickPlaceToOverwrite}</Panel.Heading>
							<ListGroup fill={"fill"}>
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

getContext("SCHEMA_FIELD_WRAPPERS").NamedPlaceSaverField = true;
