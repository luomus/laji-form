import * as React from "react";
import * as PropTypes from "prop-types";
import { FieldProps } from "../../types";
import VirtualSchemaField from "../VirtualSchemaField";
import { addLajiFormIds } from "../..//utils";

const propsPropType = PropTypes.shape({
	from: PropTypes.string.isRequired,
	fromArrayKey: PropTypes.string,
	joinArray: PropTypes.bool,
});

/**
 * Watches a specified field which contains taxon set IDs.
 * 
 * When taxon set IDs are added, it fetches the taxa in those sets from the API and adds them to the units in formData.
 * 
 * When taxon set IDs are removed, it removes any taxa belonging to those sets from the units in formData.
 *
 * uiSchema = {
 *   "ui:field": "TaxonSetPopulatorField",
 *   "ui:options": {
 *     "props": {
 *       "from": "taxonCensus",                    	// Source object containing taxon set IDs
 *       "fromArrayKey": "censusTaxonSetID",      	// Field within source object containing the taxon set IDs
 *    	 "joinArray": true,                      	// Join array of IDs into comma-separated string
 *     }
 *   }
 * }
 */
@VirtualSchemaField
export default class TaxonSetPopulatorField extends React.Component<FieldProps> {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				props: PropTypes.oneOfType([PropTypes.arrayOf(propsPropType), propsPropType])
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array", "object"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired
	};

	static getName() {
		return "TaxonSetPopulatorField";
	}

	selectedTaxonSets: string[] = [];
	unitTaxonSets: Record<string, string[]> = {};

	getStateFromProps() {
		return { onChange: this.onChange };
	}

	async componentDidMount() {
		const taxonCensus = this.props.formData?.taxonCensus || [];
		this.selectedTaxonSets = taxonCensus.map((item: any) => item.censusTaxonSetID);

		let resultTaxonSets: {id: string, taxonSets: string[]}[] = [];
		if (this.selectedTaxonSets.length > 0) {
			const allResults = await Promise.all(
				this.selectedTaxonSets.map(taxonSetId => this.fetchTaxaFromSet(this.props, [taxonSetId]))
			);
			resultTaxonSets = allResults.flat().map((result: any) => ({
				id: result.id,
				taxonSets: result.taxonSets || []
			}));
		}

		this.props.formData?.units?.forEach((unit: any) => {
			const taxonID = unit?.identifications?.[0]?.taxonID;
			if (!taxonID) {
				return;
			}
			const taxonSets = resultTaxonSets?.find((result: any) => result.id === taxonID)?.taxonSets || [];
			this.unitTaxonSets[taxonID] = taxonSets;
		});
	}

	onChange = async (formData: any) => {
		const { translations } = this.props.formContext;

		const previousTaxonSets: string[] = this.selectedTaxonSets;
		const currentTaxonSets: string[] = formData?.taxonCensus?.map((item: any) => item.censusTaxonSetID) || [];

		const deletedTaxonSets: string[] = previousTaxonSets.filter((item: string) => !currentTaxonSets.includes(item));
		const addedTaxonSets: string[] = currentTaxonSets.filter((item: string) => !previousTaxonSets.includes(item));

		this.selectedTaxonSets = formData?.taxonCensus?.map((item: any) => item.censusTaxonSetID) || [];

		if (deletedTaxonSets.length > 0) {
			deletedTaxonSets.map((deletedTaxonSetId: string) => {
				const currentUnits = Array.isArray(this.props.formData?.units) ? this.props.formData.units : [];
				let observationsExist = false;

				const deletedTaxonSetUnits = currentUnits.filter((unit: any) => {
					return this.unitTaxonSets[unit.identifications[0].taxonID]
					&& this.unitTaxonSets[unit.identifications[0].taxonID].includes(deletedTaxonSetId);
				});
				observationsExist = deletedTaxonSetUnits.some((unit: any) =>
					unit.observationStatus !== "MY.observationStatusIgnored"
				);
				if (observationsExist) {
					window.alert(translations?.TaxonSetDeletionFailed);
					const restoredFormData = {
						...formData,
						taxonCensus: [
							...formData.taxonCensus,
							{
								censusTaxonSetID: deletedTaxonSetId,
								taxonCensusType: "MY.taxonCensusTypeCounted"
							}
						]
					};
					this.selectedTaxonSets = [...this.selectedTaxonSets, deletedTaxonSetId];
					this.props.onChange(restoredFormData);
					return;
				}

				const updatedUnits = currentUnits.filter((unit: any) => {
					return !this.unitTaxonSets[unit.identifications[0].taxonID]
					|| !this.unitTaxonSets[unit.identifications[0].taxonID].includes(deletedTaxonSetId);
				});

				const sortedUnits = this.sortByTaxonSet(updatedUnits, currentTaxonSets);

				const updatedFormData = {
					...formData,
					units: sortedUnits
				};

				this.props.onChange(updatedFormData);
			});
			return;
		}

		if (addedTaxonSets.length > 0) {
			const currentUnits = Array.isArray(this.props.formData?.units) ? this.props.formData.units : [];

			// if current units include any units with taxon sets that are being added, return to avoid duplicates
			const duplicateUnits = currentUnits.filter((unit: any) => {
				return this.unitTaxonSets[unit.identifications[0].taxonID]
				&& this.unitTaxonSets[unit.identifications[0].taxonID].some((taxonSetId: string) => addedTaxonSets.includes(taxonSetId));
			});
			if (duplicateUnits.length > 0) {
				return;
			}

			const results = await this.fetchTaxaFromSet(this.props, addedTaxonSets);

			const tmpIdTree = this.props.formContext.services.ids.getRelativeTmpIdTree(this.props.idSchema.units.$id);
			const newUnits = results.map((result: any) => {
				this.unitTaxonSets[result.id] = result.taxonSets || [];
				return addLajiFormIds({
					identifications: [{
						taxon: result.scientificName,
						taxonID: result.id,
						taxonVerbatim: result.vernacularName
					}],
					informalTaxonGroups: result.informalTaxonGroups || []
				}, tmpIdTree, false)[0];
			});

			const sortedUnits = this.sortByTaxonSet([...currentUnits, ...newUnits], currentTaxonSets);

			const updatedFormData = {
				...formData,
				units: sortedUnits
			};

			this.props.onChange(updatedFormData);
			return;
		}

		this.props.onChange(formData);
	};

	// sort unit by taxon set (lowest index of unit's taxon sets in currentTaxonSets)
	private sortByTaxonSet(units: any[], taxonSets: string[]): any[] {
		return units.sort((a: any, b: any) => {
			const aTaxonSets = this.unitTaxonSets[a.identifications?.[0]?.taxonID] || [];
			const bTaxonSets = this.unitTaxonSets[b.identifications?.[0]?.taxonID] || [];
			const aIndex = aTaxonSets.reduce((min: number, taxonSet: string) => {
				const idx = taxonSets.indexOf(taxonSet);
				return idx !== -1 && idx < min ? idx : min;
			}, taxonSets.length);
			const bIndex = bTaxonSets.reduce((min: number, taxonSet: string) => {
				const idx = taxonSets.indexOf(taxonSet);
				return idx !== -1 && idx < min ? idx : min;
			}, taxonSets.length);
			return aIndex - bIndex;
		});
	}

	private async fetchTaxaFromSet(props: any, taxonSets: any): Promise<any[]> {
		const apiClient = props.formContext?.apiClient;

		if (!apiClient) {
			return [];
		}

		try {
			const response = await apiClient.post("/taxa",
				{
					query: {
						pageSize: 1000,
						selectedFields: ["id", "scientificName", "vernacularName", "informalTaxonGroups", "taxonSets"]
					}
				},
				{
					taxonSets
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
