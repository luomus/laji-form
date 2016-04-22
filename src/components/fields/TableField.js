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

		let rows = [];

		let headers = [];
		Object.keys(properties).forEach((property) => {
			headers.push(<label>{property}</label>);
		});

		rows.push(<TableRow>{headers}</TableRow>);
		
		props.formData.forEach((row) => {
			let rowSchemas = [];
			Object.keys(properties).forEach((property) => {
				// let formData = (props.formData && props.formData[property]) ? props.formData[property] : getDefaultFormState(properties[property], undefined, props.schema.definitions);
				let formData = row;
				rowSchemas.push(<SchemaField
					schema={properties[property]}
					uiSchema={{}}
					idSchema={props.idSchema}
					formData={formData[property]}
					errorSchema={(props.errorSchema) ? props.errorSchema[property] : {}}
					registry={props.registry}
					onChange={props.onChange} />)
			});
			rows.push(<TableRow>{rowSchemas}</TableRow>)
		});

		// uiSchema={props.uiSchema[property]}

		// Object.keys(properties).forEach((property) => {
		// 	let formData = (props.formData && props.formData[property]) ? props.formData[property] : getDefaultFormState(properties[property], undefined, props.schema.definitions);
		// 	rows.push(<TableRow><SchemaField
		// 		schema={properties[property]}
		// 		uiSchema={{}}
		// 		idSchema={props.idSchema}
		// 		formData={formData}
		// 		errorSchema={(props.errorSchema) ? props.errorSchema[property] : {}}
		// 		registry={props.registry}
		// 		onChange={props.onChange} /></TableRow>)
		// });

		return (<table>{rows}</table>);

		// let rows = [];
		// rows.push(<TableRow data={content})
		// this.props.formData.forEach((item) => {
		// 	rows.push(<TableRow data={item} />);
		// });
		// return content;

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

class TableRow extends Component {
	render() {
		let cells = [];
		this.props.children.forEach((child, idx) => {
			cells.push(<td key={idx}>{child}</td>);
		});
		return (<tr>{cells}</tr>)
	}
}
