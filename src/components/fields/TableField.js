import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions, updateTailUiSchema, isHidden, getUUID } from "../../utils";
import { orderProperties } from "@rjsf/utils";
import { DeleteButton } from "../components";
import { getButtonElems, handlesArrayKeys } from "../templates/ArrayFieldTemplate";
import BaseComponent from "../BaseComponent";
import ReactContext from "../../ReactContext";

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
export default class TableField extends React.Component {
	static contextType = ReactContext;
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
			type: PropTypes.oneOf(["array"]),
			items: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
		}).isRequired
	}

	render() {
		const {schema, uiSchema = {}, formData, registry: {fields: {ArrayField}}, formContext} = this.props;
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

		const schemaLength = schemaPropsArray.filter(col => !isHidden(uiSchema.items, col)).length;
		const defaultCol = parseInt(12 / schemaLength);
		const defaultWrapperCol = parseInt(12 / (1 + (Object.keys(schemaProps).filter(col => !isHidden(uiSchema.items, col)).length  - schemaLength)));

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
			} else {
				_uiSchema = {..._uiSchema, items: {...(uiSchema.items || {}), ...itemsUiSchema, "ui:options": {...getUiOptions(uiSchema.items), ...getUiOptions(itemsUiSchema)}}};
			}
		}

		_uiSchema["ui:ArrayFieldTemplate"] = TableArrayFieldTemplate;

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
					formContext: _formContext
				}}
				formContext={_formContext}
			/>
		);
	}
}

@handlesArrayKeys
class TableArrayFieldTemplate extends React.Component {
	static contextType = ReactContext;
	render() {
		const {props} = this;
		const {schema, uiSchema, formContext: {cols, wrapperCols, schemaPropsArray}, idSchema, readonly, disabled} = props;
		const schemaProps = schema.additionalItems ? schema.additionalItems.properties : schema.items.properties;
		const {Label} = this.props.formContext;
		const {Row, Col} = this.context.theme;
		const labels = orderProperties(
			schemaPropsArray.filter(col => !isHidden(uiSchema.items, col)),
			(uiSchema.items || {})["ui:order"]
		).map(propName => {
			const propUiSchema = uiSchema && uiSchema.items && uiSchema.items[propName] || {};
			return (
				<Col {...cols} key={propName + "-label"}>
					<Label
						label={"title" in schemaProps[propName] ? schemaProps[propName].title : propName}
						disabled={false}
						id={idSchema[propName].$id}
						required={(schema.items.required && schema.items.required.indexOf(propName) > -1)
						|| propUiSchema["ui:required"]}
					  uiSchema={propUiSchema} />
				</Col>
			);
		});

		const options = getUiOptions(props.uiSchema);
		const {confirmDelete, deleteCorner, removable = true, nonRemovables = [], buttons, "ui:deleteHelp": deleteHelp} = options;
		if (!this.deleteButtonRefs) this.deleteButtonRefs = [];

		const getRefFor = i => elem => {this.deleteButtonRefs[i] = elem;};

		return (
			<div className="table-field">
				<Row>
					<div className="laji-form-field-template-item">
						<div className="laji-form-field-template-schema">{labels}</div>
						<div className="laji-form-field-template-buttons" />
					</div>
				</Row>
				{props.items.map((item, i) => {
					const deleteButton = (
						<DeleteButton ref={getRefFor(i)}
						              id={`${props.idSchema.$id}_${i}`}
						              disabled={readonly || disabled}
						              onClick={item.onDropIndexClick(item.index)}
						              confirm={confirmDelete}
						              corner={deleteCorner}
						              tooltip={deleteHelp}
						              translations={props.formContext.translations}/>
					);
					return (
						<Row key={getUUID(props.formData[item.index]) || item.key}>
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
