import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils";
import { Row, Col } from "react-bootstrap";
import Button from "../Button";
import Label from "../../components/Label";

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
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}

	onChange = (formData) => {
		this.props.onChange(formData, {validate: false});
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		
		const {schema, uiSchema, idSchema, formData} = this.props;

		const items = [];
		const labels = [];

		const schemaProps = schema.additionalItems ? schema.additionalItems.properties : schema.items.properties;
		const schemaLength = Object.keys(schemaProps).length;
		const baseDivision = parseInt(12 / schemaLength);
		Object.keys(schemaProps).forEach((propName, i) => {
			let division = baseDivision;
			if (!i) division = 12 - ((schemaLength - 1) * division);
			division = Math.min(4, division);

			labels.push(<Col xs={division} key={propName + "-label"}><Label
			                  label={schemaProps[propName].title || propName}
			                  disabled={false}
			                  id={idSchema[propName].$id}
			                  help={(uiSchema && uiSchema.items[propName] && uiSchema.items[propName]["ui:help"]) ? uiSchema.items[propName]["ui:help"] : undefined}
			/></Col>)
		});
		items.push(<Row key="labels"><Row><Col xs={10}>{labels}</Col><Col xs={2} /></Row></Row>);

		if (formData) formData.forEach((item, idx) => {
			let itemIdPrefix = this.props.idSchema.$id + "_" + idx;

			const isAdditional = this.props.schema.additionalItems &&  idx >= this.props.schema.items.length;

			let schema = (Array.isArray(this.props.schema.items) && idx < this.props.schema.items.length) ? this.props.schema.items[idx] : this.props.schema.items;
			if (isAdditional) schema = this.props.schema.additionalItems;

			let uiSchema = {};
			if (this.props.uiSchema.additionalItems && idx >= this.props.schema.items.length) uiSchema = this.props.uiSchema.additionalItems;
			else if (this.props.uiSchema.items) uiSchema = this.props.uiSchema.items;

			let uiOptions = {colType: "xs", showLabels: false};
			if (uiSchema["ui:field"]) uiOptions.uiSchema = {"ui:field": uiSchema["ui:field"], "ui:options": uiSchema["ui:options"]};
			uiSchema = update(uiSchema, {$merge: {"ui:field": "grid", "ui:options": uiOptions}});
			items.push(<Row key={idx}>
				<Col xs={10}><SchemaField
					formData={item}
					onChange={this.onChangeForIdx(idx)}
					schema={schema}
					uiSchema={uiSchema}
					idSchema={toIdSchema(schema, itemIdPrefix, this.props.registry.definitions)}
					registry={this.props.registry}
					errorSchema={this.props.errorSchema[idx]} /></Col>
				<Col xs={2}>{isAdditional ? <Button type="danger" classList={["col-xs-12"]} onClick={ e => { e.preventDefault(); this.onChange(update(formData, {$splice: [[idx, 1]]})) } }>✖</Button> : null}</Col>
			</Row>)
		});

		return (formData && formData.length) ? (<div>
			{items}
			{this.getAddButton()}
		</div>) : this.getAddButton();
	}

	getAddButton = () => {
		return (<Row><Col xs={2}><Button onClick={ () => { this.addItem() }} classList={["col-xs-12"]} key="add">➕</Button></Col></Row>);
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
}

