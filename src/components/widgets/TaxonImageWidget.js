import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions } from "../../utils";

export default class TaxonImageWidget extends Component {
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
		console.log(taxonID);
		this.props.onChange(taxonID);
	}
}
