import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import bootstrap from "react-bootstrap";
import Button from "../Button"

/**
 * Field with fields, which are shown according to recursive scope.
 * uiSchema = {"ui:options": {
 *  uiSchema: <uiSchema> (ui schema for inner schema)
 *  fieldScopes: {
 *   fieldName: {
 *     fieldValue: {
 *       fields: [<string>] (fields that are shown if fieldName[fieldValue} == true)
 *       refs: [<string>] (root definitions that are merged recursively to this fieldScope)
 *       uiSchema: <uiSchema> (merged recursively to inner uiSchema
 *       fieldScopes: {fieldName: <fieldScope>, fieldName2 ...}
 *     },
 *     fieldValue2, ...
 *   }
 *  },
 *  definitions: {
 *    defName: <fieldScope>,
 *    defname2: ...
 *  }
 * }
 *
 * Field scope values accept asterisk (*) as field scope selector.
 */
export default class ScopeField extends Component {
	static propTypes = {
		formData: PropTypes.object.isRequired,
		schema: PropTypes.object.isRequired,
		uiSchema: PropTypes.object.isRequired,
		idSchema: PropTypes.object.isRequired,
		registry: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0], showAdditional: false, additionalFields: {}, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		let dictionarifiedFieldsInScopes = {};
		function getFieldScopesFields(fieldScope) {
			let scopes = fieldScope.fieldScopes;
			Object.keys(scopes).forEach((fieldName) => {
				dictionarifiedFieldsInScopes[fieldName] = true;
				Object.keys(scopes[fieldName]).forEach((fieldValue) => {
					let fields = scopes[fieldName][fieldValue].fields;
					if (fields) fields.forEach((scopesFieldName) => {
						dictionarifiedFieldsInScopes[scopesFieldName] = true;
					});
					if (scopes[fieldName][fieldValue].fieldScopes)
						getFieldScopesFields(scopes[fieldName][fieldValue]);
				});
			});
		}
		let options = props.uiSchema["ui:options"];
		getFieldScopesFields(options);

		let includeAdditionalFieldsChooserButton = !!options.includeAdditionalFieldsChooserButton;

		let schemas = this.getSchemas(props);
		return {
			...schemas,
			primaryfieldsSelector: Object.keys(props.uiSchema["ui:options"].fieldScopes)[0],
			includeAdditionalFieldsChooserButton
		};
	}

	render() {
		return (
			<div>
				<SchemaField {...this.props} {...this.state} />
				{this.renderAdditionalsButton()}
			</div>
		);
	}

	// Returns {schema: schema, uiSchema: uiSchema}
	getSchemas = (props) => {
		let {schema, uiSchema, formData, idSchema} = props;

		let options = uiSchema["ui:options"];
		let generatedUiSchema = options.uiSchema || {};

		let fieldsToShow = {};

		const definitions = options.definitions;

		function addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue) {
			let fieldScope = scopes[fieldSelector][fieldSelectorValue];
			if (!fieldScope) return;

			while (fieldScope.refs) {
				let refs = fieldScope.refs;
				fieldScope = update(fieldScope, {$merge: {refs: undefined}});
				refs.forEach(ref => {
					fieldScope = merge(fieldScope, definitions[ref]);
				});
			}

			if (fieldScope.fields) fieldScope.fields.forEach((fieldName) => {
				fieldsToShow[fieldName] = schema.properties[fieldName];
			});

			if (fieldScope.uiSchema) {
				generatedUiSchema = merge(generatedUiSchema, fieldScope.uiSchema);
			}

			if (fieldScope.fieldScopes) {
				addFieldScopeFieldsToFieldsToShow(fieldScope)
			}
		}
		
		function addFieldScopeFieldsToFieldsToShow(fieldScope) {
			if (!fieldScope) return;
			let scopes = fieldScope.fieldScopes;
			Object.keys(scopes).forEach((fieldSelector) => {
				fieldsToShow[fieldSelector] = schema.properties[fieldSelector];
				let fieldSelectorValues = formData[fieldSelector];
				if (!Array.isArray(fieldSelectorValues))  fieldSelectorValues = [fieldSelectorValues];
				if (fieldSelectorValues.length > 0 && fieldSelectorValues[0] !== undefined) fieldSelectorValues = update(fieldSelectorValues, {$push: ["+"]});
				fieldSelectorValues = update(fieldSelectorValues, {$push: ["*"]});
				fieldSelectorValues.forEach(fieldSelectorValue => {
					if (fieldSelectorValue !== undefined) {
						addFieldSelectorsValues(scopes, fieldSelector, fieldSelectorValue);
					}
				});
			});
		}
		addFieldScopeFieldsToFieldsToShow(options);

		let uiOptions = {expanderButtonText: "Näytä lisää muuttujia", contractorButtonText: "Näytä vähemmän muuttujia"};

		if (uiSchema["ui:options"] && uiSchema["ui:options"].innerUiField) uiOptions.innerUiField = uiSchema["ui:options"].innerUiField;

		let additionalFields = (this.state && this.state.additionalFields) ? this.state.additionalFields : [];
		if (additionalFields) {
			Object.keys(additionalFields).filter(field => additionalFields[field]).forEach((property) => {
				fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
			});
		}

		if (props.formData) {
			Object.keys(formData).forEach((property) => {
				if (!fieldsToShow[property] && props.schema.properties[property] && additionalFields[property] !== false) {
					fieldsToShow[property] = {additional: true, ...this.props.schema.properties[property]};
				}
			})
		}

		schema = update(schema, {$merge: {properties: fieldsToShow}});

		Object.keys(schema.properties).forEach(property => {
			idSchema = update(idSchema, {$merge: {[property]: {id: idSchema.id + "_" + property}}});
		});

		return {
			schema: schema,
			uiSchema: generatedUiSchema,
			idSchema: idSchema
		}
	}

	onChange = (data) => {
		this.props.onChange(data);
	}

	renderAdditionalsButton = () => {
		if (!this.state.includeAdditionalFieldsChooserButton) return null;

		let button = this.state.showAdditional ?
			<Button onClick={this.dontShowAdditional}>Sulje</Button> :
			<Button onClick={this.showAdditional}>Valitse lisää kenttiä</Button>;

		let list = [];
		if (this.state.showAdditional) {
			let additionalProperties = {};
			Object.keys(this.props.schema.properties).forEach(property => {
				if (!this.state.schema.properties || !this.state.schema.properties[property] || this.state.schema.properties[property].additional) additionalProperties[property] = this.props.schema.properties[property];
			});

			let options = this.props.uiSchema["ui:options"];
			if (options.additionalsGroupingPath) {
				var groups = options.additionalsGroupingPath.split('.').reduce((o,i)=>o[i], options);
			}

			if (groups) Object.keys(groups).forEach(groupName => {
				let group = groups[groupName];
				let groupFields = {};
				group.fields.forEach(field => {if (additionalProperties[field]) groupFields[field] = additionalProperties[field]});
				let groupsList = this.addAdditionalPropertiesToList(groupFields, [])
				if (groupsList.length) {
					let listGroup = (<div class="list-group-item list-group" key={groupName}><li className="list-group-item"><label>{groupName}</label></li>{groupsList}</div>)
					list.push(listGroup);
				}
			}); else {
				list = this.addAdditionalPropertiesToList(additionalProperties, list);
			}
		}

		return <div>{button}<div className="list-group scope-field-additionals-container">{list}</div></div>;
	}

	addAdditionalPropertiesToList = (properties, list) => {
		let {additionalFields} = this.state;
		let {formData} = this.props;
		if (!formData) formData = {};

		Object.keys(properties).sort((a, b) => {return ((properties[a].title || a) < (properties[b].title || b)) ? -1 : 1}).forEach(property => {
			let isIncluded = (additionalFields[property] || (additionalFields[property] !== false && formData[property]));
			list.push(<a
				key={property}
				className={"list-group-item" + (isIncluded ? " active" : "")}
				onClick={() => {
						additionalFields[property] = !isIncluded;
						this.setState({additionalFields}, () => { this.setState(this.getStateFromProps(this.props)) });
					}}>
				{properties[property].title || property}
			</a>)
		});
		return list;
	}

	showAdditional = () => {
		this.setState({showAdditional: true}, () => {this.componentWillReceiveProps(this.props)});
	}

	dontShowAdditional = () => {
		this.setState({showAdditional: false}, () => {this.componentWillReceiveProps(this.props)});
	}
}
