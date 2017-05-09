import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils";
import { getUiOptions } from "../../utils";
import { Row, Col } from "react-bootstrap";
import { DeleteButton, AddButton, Label } from "../components";
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

@BaseComponent
export default class TableField extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			items: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
		}).isRequired
	}

	isRequired = (requirements, name) => {
		return Array.isArray(requirements) &&
			requirements.indexOf(name) !== -1;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			let formData = this.props.formData;
			if (!formData) formData = [];
			formData = update(formData, {$merge: {[idx]: itemFormData}});
			this.props.onChange(formData.filter(item => {return Object.keys(item).length;}));
		};
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;

		const {props} = this;
		const {schema, uiSchema, formContext: {uiSchemaContext}, idSchema, formData} = props;

		const items = [];
		const labels = [];

		const schemaProps = schema.additionalItems ? schema.additionalItems.properties : schema.items.properties;

		const options = getUiOptions(this.props.uiSchema);

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
		const defaultWrapperCol= parseInt(12 / (1 + (Object.keys(schemaProps).length  - schemaLength)));

		const cols = {xs: undefined, sm: undefined, md: undefined, lg: undefined};
		const wrapperCols = Object.assign({}, cols);
		Object.keys(cols).forEach(col => {
			cols[col] = options[col] ? Math.min(options[col], defaultCol) : defaultCol;
			wrapperCols[col] = options[col] ? Math.min(options[col], defaultWrapperCol) : defaultWrapperCol;
		});

		schemaPropsArray.forEach(propName => {
			labels.push(
				<Col {...cols} key={propName + "-label"}>
					<Label
						label={schemaProps[propName].hasOwnProperty("title") ? schemaProps[propName].title : propName}
						disabled={false}
						id={idSchema[propName].$id}
						help={(uiSchema && uiSchema.items && uiSchema.items[propName]) ? uiSchema.items[propName]["ui:help"] : undefined} />
			</Col>);
		});

		// Dummy delete button is placed for aligning the labels correctly. Wacky.
		items.push(
			<div key="label-row" className="laji-form-field-template-item keep-vertical">
				<div className="laji-form-field-template-schema"><Row><Col {...wrapperCols}>{labels}</Col></Row></div>
				<div className="laji-form-field-template-buttons">
					<DeleteButton style={{visibility: "hidden"}} onClick={() => {}} translations={this.props.formContext.translations} />
				</div>
			</div>
		);

		if (formData) formData.forEach((item, idx) => {
			let itemIdPrefix = props.idSchema.$id + "_" + idx;

			const isAdditional = props.schema.additionalItems &&  idx >= props.schema.items.length;

			let schema = (Array.isArray(props.schema.items) && idx < props.schema.items.length) ?
				props.schema.items[idx] : props.schema.items;
			if (isAdditional) schema = props.schema.additionalItems;

			schema = schemaPropsArray.reduce((constructedSchema, prop) => {
				constructedSchema.properties[prop] = schema.properties[prop];
				return constructedSchema;
			}, {type: "object", properties: {}});

			let uiSchema = {};
			if (props.uiSchema.additionalItems && idx >= props.schema.items.length) uiSchema = props.uiSchema.additionalItems;
			else if (props.uiSchema.items) uiSchema = props.uiSchema.items;

			let uiOptions = {...cols, showLabels: false};
			if (uiSchema["ui:field"]) {
				uiSchema = {
					...uiSchema,
					uiSchema: {
						"ui:field": uiSchema["ui:field"],
						"ui:options": uiSchema["ui:options"],
						uiSchema: uiSchema.uiSchema
					}
				};
			}
			uiSchema = {...uiSchema, "ui:field": "GridLayoutField", "ui:options": uiOptions};

			const deletable = (!props.schema.additionalItems && idx !== undefined) || isAdditional;

			uiSchema = {...uiSchema, "ui:buttons": deletable ? [
				<DeleteButton key={`rm-${idx}`}  translations={props.formContext.translations} onClick={() => {
					this.onChange(update(formData, {$splice: [[idx, 1]]}));
				}} />
			] : [],
				"ui:buttonsVertical": true};

			items.push(
				<Row key={idx}>
					<Col {...wrapperCols}>
						<SchemaField
							{...this.props}
							formData={item}
							onChange={this.onChangeForIdx(idx)}
							schema={schema}
							uiSchema={uiSchema}
							name=""
							idSchema={toIdSchema(schema, itemIdPrefix, props.registry.definitions)}
							registry={props.registry}
							errorSchema={props.errorSchema[idx]} />
					</Col>
				</Row>
			);
		});

		return (
			<div>
				{items}
				<AddButton onClick={this.addItem} key="add"/>
			</div>
		);
	}

	addItem = () => {
		let item = this.getNewRowArrayItem();
		if (!this.props.formData) {
			this.onChange([item]);
		} else {
			this.onChange([...this.props.formData, item]);
		}
	}

	getNewRowArrayItem = () => {
		let props = this.props;
		const {formData} = props;
		const {additionalItems} = props.schema;
		let schema;
		if (additionalItems && (formData && formData.length > props.schema.items.length)) {
			schema = additionalItems;
		} else if (additionalItems &&
		          (!formData || formData.length === 0 || props.schema.items[formData.length - 1])) {
			let i = formData ? 0 : formData.length - 1;
			schema = props.schema.items[i];
		} else {
			schema = props.schema.items;
		}
		return getDefaultFormState(schema, undefined, props.registry.definitions);
	}
}

