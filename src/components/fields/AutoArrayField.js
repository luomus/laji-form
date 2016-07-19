import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { getDefaultFormState, toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { Row, Col } from "react-bootstrap";
import Button from "../Button";

export default class AutoArrayField extends Component {
	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		return (
			<fieldset>
				<TitleField title={this.props.schema.title || this.props.name}/>
				{this.renderItems()}
			</fieldset>
		)
	}

	renderItems = () => {
		let data = this.props.formData || [];
		data = update(data, {$push: [{}]});
		//let item = getDefaultFormState(this.state.schema, undefined, this.props.registry.definitions);

		const SchemaField = this.props.registry.fields.SchemaField;
		
		let rows = [];
		data.forEach((item, idx) => {
			let itemIdPrefix = this.props.idSchema.$id + "_" + idx;
			let removable = idx < data.length - 1;
			rows.push(
				<Row key={"row_" + idx}>
					<Col xs={10} key={"schema_container_" + idx}>
						<SchemaField
						key={idx}
						formData={item}
						onChange={this.onChangeForIdx(idx)}
						schema={this.props.schema.items}
						uiSchema={this.props.uiSchema.items}
						idSchema={toIdSchema(this.props.schema.items, itemIdPrefix, this.props.registry.definitions)}
						registry={this.props.registry}
						errorSchema={this.props.errorSchema[idx]} />
					</Col>
					{removable ? (<Col xs={2} key={"button_" + idx}>
						<Button type="danger"
						        classList={["col-xs-12"]}
						        onClick={ e => { e.preventDefault();
						                         this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]}))
						}}>✖</Button>
					</Col>) : undefined}
				</Row>);
		});
		return rows;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			if (!this.props.formData || idx === this.props.formData.length) {
				itemFormData = update(getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions), {$merge: itemFormData});
			}

			let formData = this.props.formData;
			if (!formData) formData = [];
			formData = update(formData, {$merge: {[idx]: itemFormData}});
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}
}
