import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import Button from "../Button";

export default class TableField extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			items: PropTypes.object
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
		function haveSameKeys(a, b) {
			return Object.keys(a).length == Object.keys(b).length && Object.keys(a).every((prop) => { return Object.keys(b).includes(prop)})
		}

		let schemaRequirements = [];
		let propertiesContainer = props.schema.items;
		let schemaProperties = propertiesContainer.properties;
		
		if (propertiesContainer.required) propertiesContainer.required.forEach((requirement) => {
			schemaRequirements.push(requirement);
		});
		if (props.schema.additionalItems && !haveSameKeys(schemaProperties, props.schema.additionalItems.properties)) {
			throw "Schema is not tabular!";
		}
		
		return {schemaPropertiesContainer: propertiesContainer, schemaRequirements};
	}

	isRequired = (requirements, name) => {
		return Array.isArray(requirements) &&
			requirements.indexOf(name) !== -1;
	}

	render() {

		const props = this.props;
		const {schemaPropertiesContainer, schemaRequirements} = this.state;
		let schemaProperties = schemaPropertiesContainer.properties;

		let formDataRoot = props.formData;
		let isArray = true;

		let headers = [];
		Object.keys(schemaProperties).forEach((property, i) => {
			headers.push(<label key={i}>{schemaProperties[property].title ? schemaProperties[property].title : property}{this.isRequired(schemaRequirements, property) ? "*" : undefined}</label>);
		});

		let rows = [];
		rows.push(<TableRow key={0}>{headers.concat(isArray? [undefined] : [])}</TableRow>);

		if (formDataRoot) formDataRoot.forEach((row, i) => {
			let fieldProps = {
				schema: schemaPropertiesContainer,
				errorSchema: props.errorSchema[i] || {},
				idSchema: {id: props.idSchema.id + "_" + i},
				registry: props.registry,
				formData: row,
				uiSchema: {}
			};

			if ((!props.schema.additionalItems && props.uiSchema.items && props.uiSchema.items) || (props.uiSchema.items && props.uiSchema.items && i <= props.schema.items.length - 1)) {
				fieldProps.uiSchema = props.uiSchema.items
			} else if (props.schema.additionalItems && props.uiSchema.additionalItems && props.uiSchema.additionalItems && i > props.schema.items.length - 1) {
				fieldProps.uiSchema = props.uiSchema.additionalItems;
			}
			
			if (fieldProps.uiSchema["ui:field"]) {
				let field = new props.registry.fields[fieldProps.uiSchema["ui:field"]](fieldProps);
				for (let fieldProp in fieldProps) {
					fieldProps[fieldProp] = field.state[fieldProp] || field.props[fieldProp];
				};
			}
			
			let rowSchemas = [];
			Object.keys(schemaProperties).forEach((property, j) => {
				rowSchemas.push(<SchemaField
					key={j}
					schema={update(fieldProps.schema.properties[property], {title: {$set: undefined}})}
					required={this.isRequired(schemaRequirements, property)}
					uiSchema={fieldProps.uiSchema[property]}
					idSchema={{id: fieldProps.idSchema.id + "_" + property}}
					formData={fieldProps.formData[property]}
					errorSchema={fieldProps.errorSchema[property] || {}}
					registry={props.registry}
					onChange={data => {
						let formData = update(this.props.formData, {[i]: {[property]: {$set: data}}});
						this.onChange(formData);
					}} />);
			});
			if (isArray && (!props.schema.additionalItems || i > props.schema.items.length - 1)) {
				rowSchemas = rowSchemas.concat([(<Button key={i} type="danger" classList={["col-xs-12"]} onClick={ e => { e.preventDefault(); this.onChange(update(props.formData, {$splice: [[i, 1]]})) } }>Delete</Button>)]);
			}
			rows.push(<TableRow key={i + 1}>{rowSchemas}</TableRow>)
		});

		let title = this.props.schema.title || this.props.name;
		return (
			<fieldset>
				{(title !== undefined && title !== "")  ? <TitleField title={title} /> : null}
				{
					(this.props.formData && (!this.props.formData.hasOwnProperty("length") || this.props.formData.length > 0)) ? (
						<div>
							<table><tbody>
								{rows}
							</tbody></table>
							{this.getAddButton()}
						</div>
					) : (
						<div>
							{this.getAddButton()}
						</div>
					)
				}
			</fieldset>);
	}

	getAddButton = () => {
		return (<Button onClick={ () => { this.addItem() } } key="0">Add</Button>);
	}

	addItem = () => {
		let item = this.getNewRowArrayItem();
		if (!this.props.formData) {
			this.onChange([item]);
		} else {
			this.onChange(update(this.props.formData, {$push: [item]}))
		}
	}

	getNewRowArrayItem = () => {
		let props = this.props;
		let schema;
		if (props.schema.additionalItems && (props.formData && props.formData.length > props.schema.items.length)) {
			schema = props.schema.additionalItems;
		} else if (props.schema.additionalItems && (!props.formData || props.formData.length === 0 || props.schema.items[props.formData.length - 1])) {
			let i = props.formData ? 0 : props.formData.length - 1;
			schema = props.schema.items[i];
		} else {
			schema = props.schema.items;
		}
		return getDefaultFormState(schema, undefined, props.registry.definitions);
	}

	onChange = (formData) => {
		this.props.onChange(formData, {validate: false});
	}

}

class TableRow extends Component {
	render() {
		const division = parseInt(12 / this.props.children.length);
		console.log(division);

		// make first division take rest of the total width divided by 12
		const firstDivision = division + (12 - (this.props.children.length * division));

		let cells = [];
		this.props.children.forEach((child, idx) => {
			cells.push(<td key={idx} className="col-xs-12">{child}</td>);
		});
		return (<tr>{cells}</tr>)
	}
}
