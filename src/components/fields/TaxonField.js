import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import ApiClient from "../../ApiClient";
import InputMetaInfo from "../InputMetaInfo";

export default class TaxonField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				taxonField: PropTypes.string.isRequired,
				uiSchema: PropTypes.object
			})
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
		let {formData} = props;

		let {uiSchema, taxonField} = props.uiSchema["ui:options"];

		Object.keys(props.uiSchema).forEach(prop => {
			if (prop !== "ui:options" && prop !== "ui:field") {
				uiSchema = update(uiSchema, {$merge: {[prop]: props.uiSchema[prop]}});
			}
		});

		let taxonWidgetUiSchema = {"ui:field": "taxonWidget", "ui:options": {
			"taxonID": formData["taxonID"],
			uiSchema: uiSchema[taxonField]
		}};
		uiSchema = update(uiSchema, {$merge: {[taxonField]: taxonWidgetUiSchema}});

		return {uiSchema};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
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
		return <div>
			<SchemaField {...this.props} {...this.state} />
				{options.taxonID ?
					(<InputMetaInfo className="taxon-widget">
						<span className="text-success">{this.props.registry.translations.KnownSpeciesName}</span><br />
						<a href={"http://tun.fi/" + options.taxonID + "?locale=" + this.props.registry.lang} target="_blank">{(this.state.urlTxt || options.taxonID)}</a>
					</InputMetaInfo>) : null}

		</div>
	}
}
