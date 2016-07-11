import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { toIdSchema } from  "react-jsonschema-form/lib/utils"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import { Row, Col } from "react-bootstrap";
import Button from "../Button";

export default class AutoArrayField extends Component {
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
					{removable ? (<Button key={"button_" + idx} type="danger" classList={["col-xs-2"]} onClick={ e => { e.preventDefault(); this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]})) } }>✖</Button>) : undefined}
				</Row>);
		});
		return rows;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			let formData = this.props.formData;
			if (!formData) formData = [];
			//formData = update(formData, {$merge: {[idx]: itemFormData}});
			formData[idx] = itemFormData; // this should be done immutable, but for some reason TaxonField
			                              // won't update if this is done immutable.
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}
}
