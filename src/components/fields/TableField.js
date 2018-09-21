import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, updateTailUiSchema } from "../../utils";
import { Row, Col } from "react-bootstrap";
import { DeleteButton, Label } from "../components";
import { getButtonElems, handlesArrayKeys } from "../ArrayFieldTemplate";
import BaseComponent from "../BaseComponent";

const specialRules = {
	legEditors: {
		filterProperties: ({properties, formData, uiSchemaContext}) => {
			if (!uiSchemaContext) return properties;
			const {creator} = uiSchemaContext;

			return (
				!formData ||
				formData.some(item =>
					item && item.leg && item.leg.match(/MA\.\d+/) && item.leg !== creator
				)
			) ? properties : properties.filter(field => field !== "editors");
		}
	}
};

const specialRulesPropTypes = PropTypes.oneOf(["legEditors"]);

@BaseComponent
export default class TableField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				specialRules: PropTypes.oneOfType([
					specialRulesPropTypes,
					PropTypes.arrayOf(specialRulesPropTypes)
				])		
			})
		}),
		schema: PropTypes.shape({
			items: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
		}).isRequired
	}

	render() {
		const {schema, uiSchema, formData, registry: {fields: {ArrayField}}, formContext} = this.props;
		const {uiSchemaContext} = formContext;

		const schemaProps = schema.additionalItems ? schema.additionalItems.properties : schema.items.properties;
		const options = getUiOptions(uiSchema);

		let schemaPropsArray = Object.keys(schemaProps);
		const optionsSpecialRules = options.specialRules;
		if (optionsSpecialRules) {
			(Array.isArray(optionsSpecialRules) ? optionsSpecialRules : [optionsSpecialRules]).forEach(specialRule => {
				schemaPropsArray = specialRules[specialRule].filterProperties({
					properties: schemaPropsArray, uiSchema, uiSchemaContext, formData
				});
			});
		}

		const schemaLength = schemaPropsArray.length;
		const defaultCol = parseInt(12 / schemaLength);
		const defaultWrapperCol = parseInt(12 / (1 + (Object.keys(schemaProps).length  - schemaLength)));

		const cols = {xs: undefined, sm: undefined, md: undefined, lg: undefined};
		const wrapperCols = Object.assign({}, cols);
		Object.keys(cols).forEach(col => {
			cols[col] = options[col] ? Math.min(options[col], defaultCol) : defaultCol;
			wrapperCols[col] = options[col] ? Math.min(options[col], defaultWrapperCol) : defaultWrapperCol;
		});

		const itemsSchema = schemaPropsArray.reduce((constructedSchema, prop) => {
			constructedSchema.properties[prop] = schema.items.properties[prop];
			return constructedSchema;
		}, {...schema.items, properties: {}});

		const itemsUiSchema = {
			"ui:field": "GridLayoutField", 
			"ui:options": {...cols, label: false},
		};

		let _uiSchema = uiSchema;

		if (uiSchema.items) {
			if (uiSchema.items.uiSchema) {
				_uiSchema = {
					..._uiSchema,
					items: updateTailUiSchema(uiSchema.items, {$merge: {uiSchema: itemsUiSchema}})
				};
			} else if (uiSchema.items["ui:field"] || uiSchema.items["ui:functions"]) {
				_uiSchema = {
					..._uiSchema,
					items:  {
						..._uiSchema.items,
						uiSchema: itemsUiSchema
					}
				};
			}

		}

		const _formContext = {
			...formContext,
			cols,
			wrapperCols,
			schemaPropsArray
		};
		return (
			<ArrayField
				{...this.props}
				schema={{
					...schema,
					items: itemsSchema
				}}
				uiSchema={_uiSchema}
				registry={{
					...this.props.registry,
					ArrayFieldTemplate: TableArrayFieldTemplate,
					formContext: _formContext
				}}
				formContext={_formContext}
			/>
		);
	}
}

@handlesArrayKeys
class TableArrayFieldTemplate extends Component {
	render() {
		const {props} = this;
		const {schema, uiSchema, formContext: {cols, wrapperCols, schemaPropsArray}, idSchema} = props;
		const schemaProps = schema.additionalItems ? schema.additionalItems.properties : schema.items.properties;

		const labels =schemaPropsArray.map(propName => 
			<Col {...cols} key={propName + "-label"}>
				<Label
					label={schemaProps[propName].hasOwnProperty("title") ? schemaProps[propName].title : propName}
					disabled={false}
					id={idSchema[propName].$id}
					required={schema.items.required && schema.items.required.indexOf(propName) > -1}
					help={(uiSchema && uiSchema.items && uiSchema.items[propName]) ? uiSchema.items[propName]["ui:help"] : undefined} />
			</Col>
		);

		const options = getUiOptions(props.uiSchema);
		const {confirmDelete, deleteCorner, removable = true, nonRemovables = [], buttons, "ui:deleteHelp": deleteHelp} = options;
		if (!this.deleteButtonRefs) this.deleteButtonRefs = [];

		const getRefFor = i => elem => {this.deleteButtonRefs[i] = elem;};

		return (
			<div>
				<Row>{labels}</Row>
				{props.items.map((item, i) => {
					const deleteButton = (
						<DeleteButton ref={getRefFor(i)}
						              onClick={item.onDropIndexClick(item.index)}
						              className="laji-form-field-template-buttons"
						              confirm={confirmDelete}
						              corner={deleteCorner}
						              tooltip={deleteHelp}
						              translations={props.formContext.translations}/>
					);
					return (
						<Row key={item.index} >
							<Col {...wrapperCols}>
								<div className="laji-form-field-template-item keep-vertical">
									<div className="laji-form-field-template-schema">{item.children}</div>
									{item.hasRemove && !nonRemovables.includes(item.index) && removable && deleteButton}
								</div>
							</Col>
						</Row>
					);
				}
				)}
				{getButtonElems(buttons, props)}
			</div>
		);
	}
}
