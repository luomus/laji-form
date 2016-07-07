import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import ApiClient from "../../ApiClient";

export default class TaxonField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.object
		}).isRequired
	}

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
		const SchemaField = this.props.registry.fields.SchemaField;
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
		const SchemaField = this.props.registry.fields.SchemaField;

		let options = this.props.uiSchema["ui:options"];
		return <div className="taxon-widget">
			<SchemaField {...this.props} {...this.state} />
			<div key={options.taxonID} className="taxon-widget-meta">
				{options.taxonID ?
					(<div>
						<span className="text-success">Tunnettu nimi</span><br />
						<a href={"http://tun.fi/" + options.taxonID} target="_blank">{(this.state.urlTxt || options.taxonID)}</a>
					</div>) : null}

			</div>
		</div>
	}
}
