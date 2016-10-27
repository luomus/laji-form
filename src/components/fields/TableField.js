import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils";
import { Row, Col } from "react-bootstrap";
import Button from "../Button";
import Label from "../../components/Label";

export default class TableField extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			items: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
		}).isRequired
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
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

		const {props} = this;
		const {schema, uiSchema, idSchema, formData} = props;

		const items = [];
		const labels = [];

		const schemaProps = schema.additionalItems ? schema.additionalItems.properties : schema.items.properties;
		const schemaLength = Object.keys(schemaProps).length;
		const defaultCol = parseInt(12 / schemaLength);

		const options = this.props.uiSchema["ui:options"];
		const cols = {xs: undefined, sm: undefined, md: undefined,  lg: undefined};
		Object.keys(cols).forEach(col => {
			cols[col] = (options && options[col]) ? Math.min(options[col], defaultCol) : defaultCol;
		});

		Object.keys(schemaProps).forEach(propName => {
			labels.push(<Col {...cols} key={propName + "-label"}><Label
			                  label={schemaProps[propName].title || propName}
			                  disabled={false}
			                  id={idSchema[propName].$id}
			                  help={(uiSchema && uiSchema.items[propName] && uiSchema.items[propName]["ui:help"]) ? uiSchema.items[propName]["ui:help"] : undefined}
			/></Col>)
		});
		items.push(<div className="laji-form-field-template-item"><div className="laji-form-field-template-schema">{labels}</div><div className="laji-form-field-template-buttons" /></div>);

		if (formData) formData.forEach((item, idx) => {
			let itemIdPrefix = props.idSchema.$id + "_" + idx;

			const isAdditional = props.schema.additionalItems &&  idx >= props.schema.items.length;

			let schema = (Array.isArray(props.schema.items) && idx < props.schema.items.length) ? props.schema.items[idx] : props.schema.items;
			if (isAdditional) schema = props.schema.additionalItems;

			let uiSchema = {};
			if (props.uiSchema.additionalItems && idx >= props.schema.items.length) uiSchema = props.uiSchema.additionalItems;
			else if (props.uiSchema.items) uiSchema = props.uiSchema.items;

			let uiOptions = {...cols, showLabels: false, neverLimitWidth: true};
			if (uiSchema["ui:field"]) uiOptions.uiSchema = {"ui:field": uiSchema["ui:field"], "ui:options": uiSchema["ui:options"]};
			uiSchema = update(uiSchema, {$merge: {"ui:field": "grid", "ui:options": uiOptions}});


			let registry = props.registry;

			registry =update(props.registry, {formContext: {$merge: {buttons: []}}});
			if ((!props.schema.additionalItems && idx) || isAdditional) {
				registry =update(props.registry, {formContext: {$merge: {buttons:
					[<Button bsStyle="danger" onClick={ e => {e.preventDefault(); this.onChange(update(formData, {$splice: [[idx, 1]]})) } }>✖</Button>]
				}}});
			}

			items.push(
				<SchemaField
					formData={item}
					onChange={this.onChangeForIdx(idx)}
					schema={schema}
					uiSchema={uiSchema}
					idSchema={toIdSchema(schema, itemIdPrefix, props.registry.definitions)}
					registry={registry}
					errorSchema={props.errorSchema[idx]} />
			);
		});

		return (formData && formData.length) ? (<div>
			{items}
			{this.getAddButton()}
		</div>) : this.getAddButton();
	}

	getAddButton = () => {
		return (<Row><Col xs={2}><Button onClick={ () => { this.addItem() }} key="add">➕</Button></Col></Row>);
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

