import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";

export default class TaxonImageWidget extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		value: PropTypes.string
	}
	render() {
		const {SchemaField} = this.props.registry.fields;
		const {uiSchema} = getUiOptions(this.props);
		const schemaField = uiSchema
			? <SchemaField {...this.props} schema={{...this.props.schema, title: ""}} uiSchema={{...uiSchema, "ui:title": ""}} />
			: null;

		return (
			<React.Fragment>
				{["MX.45", "MX.255"].map(taxonID => <div key={taxonID} style={{height: 100, width:100}} onClick={this.onTaxonImageClick(taxonID)} />)}
				{schemaField}
			</React.Fragment>
		);
	}

	onTaxonImageClick = (taxonID) => () => {
		this.props.onChange(taxonID);
	}
}
