import * as React from "react";
import * as PropTypes from "prop-types";
import { FieldProps } from "../../types";
import VirtualSchemaField from "../VirtualSchemaField";
import { addLajiFormIds, getUiOptions } from "../../utils";
import { components, operations } from "../../generated/api";

type StoreDocument = components["schemas"]["store-document"];
type GetDocumentsResponse = operations["DocumentsController_getPage"]["responses"][200]["content"]["application/json"];

const unitFilterPropType = PropTypes.shape({
	field: PropTypes.string.isRequired,
	valueIn: PropTypes.arrayOf(PropTypes.string).isRequired
});

/**
 * Watches a specified field which contains a year.
 * 
 * Fetches taxa observed in the specified year and adds them to the units in formData.
 *
 * uiSchema = {
 *   "ui:field": "TaxaByYearPopulatorField",
 *   "ui:options": {
 *     "collectionID": "HR.6920",                       // Collection ID to fetch documents from
 *     "unitFilter": {                                  // Filter for units from fetched documents
 *       "field": "observationStatus",                  // Field to filter on
 *       "valueIn": ["MY.observationStatusObservedNoCount", ...] // Allowed values
 *     }
 *   }
 * }
 */
@VirtualSchemaField
export default class TaxaByYearPopulatorField extends React.Component<FieldProps> {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				collectionID: PropTypes.string,
				unitFilter: unitFilterPropType
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array", "object"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired
	};

	static getName() {
		return "TaxaByYearPopulatorField";
	}

	getStateFromProps() {
		return { onChange: this.onChange };
	}

	async componentDidMount() {
		await this.populateTaxa(this.props.formData);
	}

	onChange = async (formData: any) => {
		await this.populateTaxa(formData);
	};

	private async populateTaxa(formData: any) {
		if (!formData?.gatheringEvent?.dateBegin) {
			this.props.onChange(formData);
			return;
		}

		const { collectionID, unitFilter } = getUiOptions(this.props.uiSchema);
		const namedPlace = formData?.namedPlaceID;
		const observationYear = Number(formData?.gatheringEvent?.dateBegin?.split("-")[0]) || undefined;

		const res = await this.fetchTaxaFromNamedPlace(this.props, collectionID, namedPlace, observationYear);

		let fetchedUnits = res.flatMap(doc => doc.gatherings.flatMap(g => g.units));
		if (unitFilter?.field && unitFilter?.valueIn) {
			fetchedUnits = fetchedUnits.filter((u: any) => u[unitFilter.field] && unitFilter.valueIn.includes(u[unitFilter.field]));
		}

		if (fetchedUnits.length === 0) {
			this.props.onChange(formData);
			return;
		}

		const seen = new Set<string>();
		const identifications = fetchedUnits.flatMap(u => u.identifications).filter(id => {
			if (!id.taxonID || seen.has(id.taxonID)) return false;
			seen.add(id.taxonID);
			return true;
		});

		const tmpIdTree = this.props.formContext.services.ids.getRelativeTmpIdTree(this.props.idSchema.$id + "_units");
		const formUnits = formData.gatherings?.[0]?.units
			? [...formData.gatherings[0].units].filter((unit: any) => unit.unitFact?.autocompleteSelectedTaxonID)
			: [];

		identifications.forEach((identification: any) => {
			if (!formUnits.some((u: any) => u.unitFact?.autocompleteSelectedTaxonID === identification.taxonID)) {
				formUnits.push(addLajiFormIds({
					identifications: [{
						taxon: identification.taxonVerbatim
					}],
					unitFact: {
						autocompleteSelectedTaxonID: identification.taxonID
					}
				}, tmpIdTree, false)[0]);
			}
		});

		this.props.onChange({
			...formData,
			gatherings: [
				{
					...(formData.gatherings?.[0] || {}),
					units: formUnits
				},
				...(formData.gatherings?.slice(1) || [])
			]
		});
		return;
	}

	private async fetchTaxaFromNamedPlace(props: any, collectionID: string | undefined, namedPlace: string | undefined, observationYear: number | undefined): Promise<StoreDocument[]> {
		const apiClient: import("../../ApiClient").default | undefined = props.formContext?.apiClient;

		if (!apiClient) {
			return [];
		}

		try {
			const response: GetDocumentsResponse = await apiClient.get("/documents",
				{
					query: {
						collectionID,
						namedPlace,
						observationYear,
						selfAsEditorOrCreator: true,
						pageSize: 1000,
						page: 1
					}
				}
			);

			if (!response.results || !Array.isArray(response.results)) {
				return [];
			}

			return response.results;
		} catch (error) {
			return [];
		}
	}
}
