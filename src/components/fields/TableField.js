import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState, toIdSchema } from  "react-jsonschema-form/lib/utils";
import { Row, Col } from "react-bootstrap";
import Button from "../Button";

export default class TableField extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			items: PropTypes.object
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
		
		const {formData} = this.props;

		const items = [];
		if (formData) formData.forEach((item, idx) => {
			let itemIdPrefix = this.props.idSchema.$id + "_" + idx;

			let uiSchema = this.props.uiSchema.items;
			let uiOptions = {colType: "xs"};
			if (idx) uiOptions.showLabels = false;
			uiSchema = update(uiSchema, {$merge: {"ui:field": "grid", "ui:options": uiOptions}});
			items.push(<Row key={idx}>
				<Col xs={10}><SchemaField
					formData={item}
					onChange={this.onChangeForIdx(idx)}
					schema={this.props.schema.items}
					uiSchema={uiSchema}
					idSchema={toIdSchema(this.props.schema.items, itemIdPrefix, this.props.registry.definitions)}
					registry={this.props.registry}
					errorSchema={this.props.errorSchema[idx]} /></Col>
				<Col xs={2}><Button type="danger" classList={["col-xs-12"]} onClick={ e => { e.preventDefault(); this.onChange(update(formData, {$splice: [[idx, 1]]})) } }>✖</Button></Col>
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

