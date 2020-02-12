import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { parseJSONPointer, updateSafelyWithJSONPointer } from "../../utils";

@VirtualSchemaField
export default class InjectTaxonCensusFilterField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				"taxonCensusPath": PropTypes.string.isRequired,
				"taxonCensusField": PropTypes.string.isRequired,
				"injectPath": PropTypes.string.isRequired
			}).isRequired,
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	static getName() {return  "InjectTaxonCensusFilterField";}

	getStateFromProps(props) {
		const options = this.getUiOptions();
		const {taxonCensusPath, taxonCensusField, injectPath} = options;
		let {schema, uiSchema, idSchema, formData, errorSchema} = props;

		const taxonCensusData = parseJSONPointer(formData, taxonCensusPath);
		const injectData = (taxonCensusData || []).map(d => d[taxonCensusField]).join(",");

		uiSchema = updateSafelyWithJSONPointer(uiSchema, injectData, injectPath);

		return {schema, uiSchema, idSchema, formData, errorSchema};
	}
}
