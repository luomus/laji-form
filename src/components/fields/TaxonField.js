import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import ApiClient from "../../ApiClient";

export default class TaxonField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema, formData} = props;
		uiSchema = uiSchema["ui:options"].uiSchema;

		Object.keys(props.uiSchema).forEach(prop => {
			if (prop !== "ui:options" && prop !== "ui:field") {
				uiSchema = update(uiSchema, {$merge: {[prop]: props.uiSchema[prop]}});
			}
		});

		let taxonWidgetUiSchema = {"ui:field": "taxonWidget", "ui:options": {
			"taxonID": formData["taxonID"],
			uiSchema: uiSchema.informalNameString
		}};
		uiSchema = update(uiSchema, {$merge: {informalNameString: taxonWidgetUiSchema}});

		return {uiSchema};
	}

	render() {
		return <SchemaField {...this.props} {...this.state} />
	}

}

export class TaxonWidgetField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema} = props;
		const options = props.uiSchema["ui:options"];
		const taxonID = options.taxonID;
		if (taxonID && (!this.state || taxonID !== this.state.taxonID)) new ApiClient().fetch("/taxonomy/" + options.taxonID).then(response => {
			this.setState({urlTxt: response.scientificName});
		});
		return {uiSchema: uiSchema["ui:options"].uiSchema, taxonID: props.uiSchema["ui:options"].taxonID};
	}

	render() {
		let options = this.props.uiSchema["ui:options"];
		return <div className="taxon-widget">
			<SchemaField {...this.props} {...this.state} />
			<div className="taxon-widget-meta">
				{options.taxonID ? (<div><span className="text-success">Tunnettu nimi</span><br /></div>) : null}
				<a href={"http://tun.fi/" + options.taxonID} target="_blank">{(this.state.urlTxt || options.taxonID)}</a>
			</div>
		</div>
	}
}
