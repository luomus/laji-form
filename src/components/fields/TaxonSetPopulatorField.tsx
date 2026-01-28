import * as React from "react";
import * as PropTypes from "prop-types";
import { parseJSONPointer} from "../../utils";
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

	async componentDidUpdate(prevProps: Readonly<FieldProps>): Promise<void> {
		const previousTaxonSets = await this.extractTaxonSets(this.props.uiSchema, prevProps);
		const currentTaxonSets = await this.extractTaxonSets(this.props.uiSchema, this.props);

		const deletedTaxonSets = previousTaxonSets.filter(item => !currentTaxonSets.includes(item));
		const addedTaxonSets = currentTaxonSets.filter(item => !previousTaxonSets.includes(item));

		if (deletedTaxonSets.length > 0) {
			deletedTaxonSets.map((deletedTaxonSetId: any) => {
				const currentUnits = Array.isArray(this.props.formData?.units) ? this.props.formData.units : [];
				const updatedUnits = currentUnits.filter((unit: any) => {
					return !unit.taxonSets || !unit.taxonSets.includes(deletedTaxonSetId);
				});
				const updatedFormData = {
					...this.props.formData,
					units: updatedUnits
				};
				this.props.onChange(updatedFormData);
			});
		}

		if (addedTaxonSets.length > 0) {
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

			const currentUnits = Array.isArray(this.props.formData?.units) ? this.props.formData.units : [];
			const updatedFormData = {
				...this.props.formData,
				units: [...currentUnits, ...newUnits]
			};

			this.props.onChange(updatedFormData);
		}
	}

	private async extractTaxonSets(uiSchema: any, initialProps: any): Promise<any[]> {
		const { props: _props = [] } = (this as any).getUiOptions(uiSchema);

		const taxonSets = await (Array.isArray(_props) ? _props : [_props]).reduce(async (props, strOrObjProp) => {
			const [fromPath, fromArrayKey, joinArray] = ["from", "fromArrayKey", "joinArray"]
				.map(p => strOrObjProp[p]);
			let from = fromPath[0] === "/"
				? parseJSONPointer(props, fromPath)
				: parseJSONPointer(props.formData, fromPath);

			if (fromArrayKey) {
				from = (from || []).map((obj: any) => obj[fromArrayKey]);
			}
			if (joinArray && Array.isArray(from)) {
				from = from.join(",");
			}

			return from;
		}, initialProps);

		return Array.isArray(taxonSets) ? taxonSets : [];
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
