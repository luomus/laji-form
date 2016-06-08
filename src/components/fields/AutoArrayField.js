import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import Button from "../Button";
import UnitField from "./ScopeField";

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
		let idx = 0;
		data.forEach((item) => {
			rows.push(<SchemaField
				key={idx}
				formData={item}
				onChange={this.onChangeForIdx(idx)}
				schema={this.props.schema.items}
				uiSchema={this.props.uiSchema.items}
				idSchema={{id: this.props.idSchema.id + "_" + idx}}
				registry={this.props.registry}
				errorSchema={this.props.errorSchema[idx]} />);
			idx++;
		});
		return rows;
	}

	onChangeForIdx = (idx) => {
		return (itemFormData) => {
			let formData = this.props.formData;
			if (!formData) formData = [];
			formData[idx] = itemFormData;
			this.props.onChange(formData.filter(item => {return Object.keys(item).length}));
		}
	}
}
