import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import HorizontalWrapper from "../HorizontalWrapper";
import Button from "../Button";

export default class TableField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	getStateFromProps = (props) => {
		function haveSameKeys(a, b) {
			return Object.keys(a).length == Object.keys(b).length && Object.keys(a).every((prop) => { return Object.keys(b).includes(prop)})
		}

		let schemaProperties;
		if (props.schema.items) {
			schemaProperties = props.schema.items;
			let propertiesContainer = schemaProperties;
			if (!propertiesContainer.properties) {
				let propertiesItems = Object.keys(propertiesContainer);
				propertiesContainer = schemaProperties[propertiesItems[0]];
				propertiesItems.shift();
				if (!propertiesItems.every((item) => { return haveSameKeys(item, propertiesContainer) })) {
					throw "Schema is not tabular!";
				}
			}
			schemaProperties = propertiesContainer.properties;
			if (props.schema.additionalItems && !haveSameKeys(schemaProperties, props.schema.additionalItems.properties)) {
				throw "Schema is not tabular!";
			}
		} else if (props.schema.properties) {
			schemaProperties = props.schema.properties;
		}
		return {schemaProperties};
	}

	render() {
		let props = this.props;
		let schemaProperties = this.state.schemaProperties;

		let formDataRoot, isArray;
		if (props.schema.type == "array") {
			formDataRoot = props.formData;
			isArray = true;
		} else {
			formDataRoot = [props.formData];
			isArray = false;
		}

		let headers = [];
		Object.keys(schemaProperties).forEach((property, i) => {
			headers.push(<label key={i}>{schemaProperties[property].title ? schemaProperties[property].title : property}</label>);
		});

		let rows = [];
		rows.push(<TableRow key={0}>{headers.concat(isArray? [undefined] : [])}</TableRow>);

		if (formDataRoot) formDataRoot.forEach((row, i) => {
			let errorSchemaRoot, idSchemaRoot, formDataUpdateRoot, formDataUpdateRootPointer, uiSchemaRoot;
			if (props.schema.type == "array") {
				errorSchemaRoot = props.errorSchema[i];
				idSchemaRoot = props.idSchema.id + "_" + i;
				formDataUpdateRoot = {[i]: {}};
				formDataUpdateRootPointer = formDataUpdateRoot[i];
				if ((!props.schema.additionalItems && props.uiSchema.items && props.uiSchema.items) || (props.uiSchema.items && props.uiSchema.items && i <= props.schema.items.length - 1)) {
					uiSchemaRoot = props.uiSchema.items
				} else if (props.schema.additionalItems && props.uiSchema.additionalItems && props.uiSchema.additionalItems && i > props.schema.items.length - 1) {
					uiSchemaRoot = props.uiSchema.additionalItems;
				}
			} else {
				errorSchemaRoot = props.errorSchema;
				idSchemaRoot = props.idSchema.id;
				formDataUpdateRoot = {};
				formDataUpdateRootPointer = formDataUpdateRoot;
				uiSchemaRoot = props.uiSchema;
			}

			let rowSchemas = [];
			Object.keys(schemaProperties).forEach((property, j) => {
				let uiSchema = uiSchemaRoot ? (uiSchemaRoot[property] || {}) : {};

				rowSchemas.push(<SchemaField
					key={j}
					schema={update(schemaProperties[property], {title: {$set: undefined}})}
					uiSchema={uiSchema}
					idSchema={{id: idSchemaRoot + "_" + property}}
					formData={row ? row[property] : undefined}
					errorSchema={(errorSchemaRoot && errorSchemaRoot[property]) ? errorSchemaRoot[property] : {}}
					registry={props.registry}
					onChange={(data) => {
						formDataUpdateRootPointer[property] = {$set: data};
						let formData = update(this.props.formData, formDataUpdateRoot);
						props.onChange(formData);
					}} />)
			});
			if (isArray && (!props.schema.additionalItems || i > props.schema.items.length - 1)) {
				rowSchemas = rowSchemas.concat([(<Button key={i} text="Delete" type="danger" classList={["col-xs-12"]} onClick={ () => { props.onChange(update(props.formData, {$splice: [[i, 1]]})) } } />)]);
			}
			rows.push(<TableRow key={i + 1}>{rowSchemas}</TableRow>)
		});

		if (isArray) {
			rows.push(
				<TableRow key={rows.length}>
					{Array(Object.keys(schemaProperties).length).fill(undefined) // empty td for every column
						.concat([this.getAddButton()])}
				</TableRow>)
		}

		return (
			<fieldset>
				<TitleField title={this.props.title || this.props.name} />
				{
					(this.props.formData && (!this.props.formData.hasOwnProperty("length") || this.props.formData.length > 0)) ? (
						<table className="table-field"><tbody>
						{rows}
						</tbody></table>
					) : (
						<div className="row"><p className="col-xs-2 col-xs-offset-10 array-item-add text-right">
							{this.getAddButton()}
						</p></div>
					)
				}
			</fieldset>);
	}

	getAddButton = () => {
		return (<Button text="Add" classList={["col-xs-12"]} onClick={ () => { this.addItem() } } key="0"/>);
	}

	addItem = () => {
		if (this.props.schema.type !== "array") throw "addItem can be called only for array schema!";

		let item = this.getNewRowArrayItem();
		if (!this.props.formData) {
			this.props.onChange([item]);
		} else {
			this.props.onChange(update(this.props.formData, {$push: [item]}))
		}
	}

	getNewRowArrayItem = () => {
		let props = this.props;
		if (!props.schema.items) throw "This is not an array field!";
		else if (props.schema.additionalItems && props.formData.length > props.schema.items.length) {
			return getDefaultFormState(props.schema.additionalItems, {}, props.registry);
		} else if (typeof(props.schema.items) === "array" && props.schema.items[props.formData.length - 1]) {
			return getDefaultFormState(props.schema.items[props.formData.length - 1], {}, props.registry);
		} else {
			return getDefaultFormState(props.schema.items, {}, props.registry);
		}
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
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
