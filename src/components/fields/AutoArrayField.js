import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { toIdSchema } from  "react-jsonschema-form/lib/utils"
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
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

		let rows = [];
		data.forEach((item, idx) => {
			let itemIdPrefix = this.props.idSchema.id + "_" + idx;
			let removable = idx < data.length - 1;
			rows.push(
				<div className="row" key={"row_" + idx}>
					<div className={removable ? "col-md-10" : "col-md-12"} key={"schema_container_" + idx}>
						<SchemaField
						key={idx}
						formData={item}
						onChange={this.onChangeForIdx(idx)}
						schema={this.props.schema.items}
						uiSchema={this.props.uiSchema.items}
						idSchema={toIdSchema(this.props.schema.items, itemIdPrefix, this.props.registry.definitions)}
						registry={this.props.registry}
						errorSchema={this.props.errorSchema[idx]} />
					</div>
					{removable ? (<Button key={"button_" + idx} type="danger" classList={["col-md-2"]} onClick={ e => { e.preventDefault(); this.props.onChange(update(this.props.formData, {$splice: [[idx, 1]]})) } }>Delete</Button>) : undefined}
				</div>);
		});
		return rows;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			let formData = this.props.formData;
			if (!formData) formData = [];
			formData = update(formData, {$merge: {[idx]: itemFormData}});
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}
}
