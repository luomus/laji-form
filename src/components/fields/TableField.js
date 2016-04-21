import React, { Component, PropTypes } from "react";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import HorizontalWrapper from "../HorizontalWrapper";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"

export default class TableField extends Component {

	constructor(props) {
		super(props);

		let uiSchema = JSON.parse(JSON.stringify(props.uiSchema));
		delete uiSchema["ui:field"];

		this.state = {uiSchema};
	}

	render() {
		return (<div className="horizontal">{this.renderSchema()}</div>)
		//return (
		//	<HorizontalWrapper><SchemaField {...this.props} uiSchema={this.state.uiSchema} /></HorizontalWrapper>
		//);
	}

	renderSchema = () => {
		let props = this.props;
		console.log(props);

		function haveSameKeys(a, b) {
			return Object.keys(a).length == Object.keys(b).length && Object.keys(a).every((prop) => { return Object.keys(b).includes(prop)})
		}

		let properties;
		if (props.schema.items) {
			properties = props.schema.items;
			let propertiesContainer = properties;
			if (!propertiesContainer.properties) {
				let propertiesItems = Object.keys(propertiesContainer);
				propertiesContainer = properties[propertiesItems[0]];
				propertiesItems.shift();
				if (!propertiesItems.every((item) => { return haveSameKeys(item, propertiesContainer) })) {
					throw "Schema is not tabular!";
				}
			}
			properties = propertiesContainer.properties;
			if (props.schema.additionalItems && !haveSameKeys(properties, props.schema.additionalItems.properties)) {
				throw "Schema is not tabular!";
			}
		}
		else if (props.schema.properties) {
			properties = props.schema.properties;
		}

		console.log(properties);

		let content = [];

		Object.keys(properties).forEach((property) => {
			content.push(<label>{property}</label>);
		});
		return content;

		//let schemas = [];
		//Object.keys(properties).forEach((property) => {
		//	let formData = (props.formData && props.formData[property]) ? props.formData[property] : getDefaultFormState(props.schema.properties[property], undefined, props.schema.definitions);
		//	schemas.push(<SchemaField
		//		schema={props.schema.properties[property]}
		//		uiSchema={props.uiSchema[property]}
		//		idSchema={props.idSchema}
		//		formData={formData}
		//		errorSchema={(props.errorSchema) ? props.errorSchema[property] : {}}
		//		registry={props.registry}
		//		onChange={props.onChange} />)
		//});
		//return schemas;
	}
}
