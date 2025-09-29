import * as React from "react";
import ReactContext from "../../../ReactContext";
import { FieldProps, JSONSchemaArray, JSONSchemaObject } from "../../../types";
import { addLajiFormIds, getDefaultFormState, getInnerUiSchema, getUiOptions } from "../../../utils";
// import { NamedPlace } from "@luomus/laji-schema";
import getContext from "../../../Context";
import { NamedPlaceChooser } from "./NamedPlaceChooser";
import type { components } from "generated/api.d";
type NamedPlace = components["schemas"]["namedPlace"];

type Props = FieldProps<NamedPlace, JSONSchemaObject | JSONSchemaArray<JSONSchemaObject>>
type State = { 
	show?: boolean;
	failed?: string
	buttonDefinition?: any;
	places?: NamedPlace[];
}
const PLACE_WHITELIST = [
	"geometry",
	"country",
	"administrativeProvince",
	"biologicalProvince",
	"municipality",
	"locality",
	"localityDescription",
	"habitat",
	"habitatDescription"
] as const;

const PLACES_FETCH_FAIL = "PLACES_FETCH_FAIL";
const PLACE_USE_FAIL = "PLACE_USE_FAIL";
const PLACE_DELETE_FAIL = "PLACE_DELETE_FAIL";

/** Compatible only with gatherings array and gathering object */
export default class NamedPlaceChooserField extends React.Component<Props, State> {
	static contextType = ReactContext;

	mounted = false;

	state: State = {};

	getUiSchema = (props: Props, buttonDefinition: any) => {
		if (buttonDefinition) {
			buttonDefinition = {
				...buttonDefinition,
				label: props.formContext.translations.ChooseFromNamedPlace
			};
			const innerUiSchema = getInnerUiSchema(props.uiSchema);
			const options = getUiOptions(innerUiSchema);
			return {
				...innerUiSchema,
				"ui:options": {
					...options,
					buttons: [
						buttonDefinition,
						...(options.buttons || [])
					]
				}
			};
		} else {
			return getInnerUiSchema(props.uiSchema);
		}
	};

	isGatheringsArray = (schema: JSONSchemaObject | JSONSchemaArray<JSONSchemaObject>)
	: schema is JSONSchemaArray<JSONSchemaObject> =>
		schema.type === "array";

	onPlaceSelected = (place: NamedPlace) => {
		const getGathering = (schema: JSONSchemaObject) => {
			let gathering = getDefaultFormState(schema);
			 
			const placeGathering = place.prepopulatedDocument!.gatherings[0];
			PLACE_WHITELIST.forEach(prop => {
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
			const { schema } = this.props;
			if (this.isGatheringsArray(schema)) {
				gathering = getGathering(schema.items);

				newFormData = [
					...(this.props.formData || []),
					gathering
				];
				this.setState({show: false});
				targetId = this.props.idSchema.$id;
				this.props.formContext.services.customEvents.send(targetId, "activeIdx", (this.props.formData || []).length);
			} else { // gathering object
				gathering = getGathering(schema);
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
	};

	onPlaceDeleted = async (place: NamedPlace & { id: string }, end: () => void) => {
		try {
			await this.props.formContext.apiClient.delete(`/named-places/{id}`, { path: { id: place.id } })
			end();
		} catch (e) {
			this.setState({failed: PLACE_DELETE_FAIL});
			this.props.formContext.notifier.error(this.props.formContext.translations.PlaceRemovalFailed);
			end();
		}
	};

	onButtonClick = () => () => {
		this.setState({show: true});
	};

	updatePlaces = (response: { results: NamedPlace[] }) => {
		if (!this.mounted) return;
		const state: State = {places: response.results.sort((a, b) => {
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;
			return 0;
		})};

		if (!response.results?.length) {
			return;
		}
		const buttonDefinition: any = {
			fn: this.onButtonClick,
			fnName: "addNamedPlace",
			glyph: "map-marker",
			label: this.props.formContext.translations.ChooseFromNamedPlace,
			id: this.props.idSchema.$id,
			changesFormData: true,
			variant: "primary"
		};
		if (this.isGatheringsArray(this.props.schema)) {
			buttonDefinition.rules = {canAdd: true};
		} else {
			buttonDefinition.position = "top";
		}
		state.buttonDefinition = buttonDefinition;

		this.setState(state);
	};

	getNamedPlacesUnsubscribe: () => void;

	componentDidMount() {
		this.mounted = true;
		this.getNamedPlacesUnsubscribe = this.props.formContext.apiClient.subscribe("/named-places", { query: { includePublic: false, pageSize: 100000 } },
			this.updatePlaces,
			() => this.setState({failed: PLACES_FETCH_FAIL}),
			1000
		);
	}

	componentWillUnmount() {
		this.mounted = false;
		this.getNamedPlacesUnsubscribe();
	}

	onHide = () => this.setState({show: false});

	render() {
		const {registry: {fields: {SchemaField}}, formContext} = this.props;
		const {translations} = formContext;
		const {failed} = this.state;
		const {Modal, Alert} = this.context.theme;

		return <>
			<SchemaField {...(this.props as any)} uiSchema={this.getUiSchema(this.props, this.state.buttonDefinition)} />
			{
				this.state.places && this.state.show ? (
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
		</>;
	}
}

getContext("SCHEMA_FIELD_WRAPPERS").NamedPlaceChooserField = true;
