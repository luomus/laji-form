import * as React from "react";
import * as PropTypes from "prop-types";
import { parseJSONPointer } from "../../utils";
import { FieldProps } from "../../types";
import VirtualSchemaField from "../VirtualSchemaField";

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

	taxonSets: any[] = [];

	getStateFromProps() {
		return { onChange: this.onChange };
	}

	onChange = async (formData: any) => {
		const previousTaxonSets = this.taxonSets;
		const currentTaxonSets = formData?.taxonCensus?.map((item: any) => item.censusTaxonSetID) || [];

		const deletedTaxonSets = previousTaxonSets.filter((item: string) => !currentTaxonSets.includes(item));
		const addedTaxonSets = currentTaxonSets.filter((item: string) => !previousTaxonSets.includes(item));

		this.taxonSets = formData?.taxonCensus?.map((item: any) => item.censusTaxonSetID) || [];

		if (deletedTaxonSets.length > 0) {
			deletedTaxonSets.map((deletedTaxonSetId: string) => {
				const currentUnits = Array.isArray(this.props.formData?.units) ? this.props.formData.units : [];
				let observationsExist = false;

				const deletedTaxonSetUnits = currentUnits.filter((unit: any) => {
					return unit.taxonSets && unit.taxonSets.includes(deletedTaxonSetId);
				});
				deletedTaxonSetUnits.map((unit: any) => {
					if (
						unit.maleIndividualCount ||
						unit.femaleIndividualCount ||
						unit.nestCount ||
						unit.unitFact?.destroyedNestCount ||
						unit.unitFact?.broodCount ||
						unit.unitFact?.femalesWithBroodsCount ||
						unit.unitFact?.juvenileCount
					) {
						window.alert(`Warning: Can't delete taxon set "${deletedTaxonSetId}" because it has observations.`);
						observationsExist = true;
						const updatedFormData = {
							...formData,
							taxonCensus: [
								...formData.taxonCensus,
								{
									censusTaxonSetID: deletedTaxonSetId,
									taxonCensusType: "MY.taxonCensusTypeCounted"
								}
							]
						};
						this.taxonSets = [...this.taxonSets, deletedTaxonSetId];
						this.props.onChange(updatedFormData);
						return;
					}
				});
				if (observationsExist) {
					return;
				}

				const updatedUnits = currentUnits.filter((unit: any) => {
					return !unit.taxonSets || !unit.taxonSets.includes(deletedTaxonSetId);
				});
				const updatedFormData = {
					...formData,
					units: updatedUnits
				};
				this.props.onChange(updatedFormData);
			});
		}

		if (addedTaxonSets.length > 0) {
			const currentUnits = Array.isArray(this.props.formData?.units) ? this.props.formData.units : [];

			// if current units include any units with taxon sets that are being added, return to avoid duplicates
			const duplicateUnits = currentUnits.filter((unit: any) => {
				return unit.taxonSets && unit.taxonSets.some((taxonSetId: string) => addedTaxonSets.includes(taxonSetId));
			});
			if (duplicateUnits.length > 0) {
				return;
			}

			const results = await this.fetchTaxaFromSet(this.props, addedTaxonSets);

			const newUnits = results.map((result: any) => {
				return {
					identifications: [{
						taxon: result.scientificName,
						taxonID: result.id,
						taxonVerbatim: result.vernacularName
					}],
					informalTaxonGroups: result.informalTaxonGroups || [],
					taxonSets: result.taxonSets || []
				};
			});

			const updatedFormData = {
				...formData,
				units: [...currentUnits, ...newUnits]
			};

			this.props.onChange(updatedFormData);
		}
	};

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
