import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";


@BaseComponent
export default class TemplateArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				template: PropTypes.arrayOf(PropTypes.object)
			})
		}).isRequired
	};

	getItemProperties = (props) => {
		const options = getUiOptions(props.uiSchema);
		const fields = Object.keys(props.schema.items.properties);

		const formData = [];
		const itemUiSchema = [];
		const itemSchema = [];

		(options.template || []).forEach((template, i) => {
			itemSchema.push({...props.schema.items});
			formData.push({});
			const uiSchema = {};
			for (let j in fields) {
				const field = fields[j];
				if (!template[field]) {
					uiSchema[field] = {...props.uiSchema.items[field]};
					formData[i][field] = (props.formData[i] && props.formData[i][field]) ? props.formData[i][field] : undefined;
				} else {
					uiSchema[field] = {"ui:field": "HiddenField"};
					formData[i][field] = template[field];
				}
			}
			itemUiSchema.push(uiSchema);
		});

		return {formData, itemUiSchema, itemSchema};
	};

	render() {
		const {registry: {fields: {ArrayField, TitleField}}} = this.props;
		const {formData, itemUiSchema, itemSchema} = this.getItemProperties(this.props);

		return (
			<div>
				{this.props.schema.title ? <TitleField title={this.props.schema.title} /> : null}
				<ArrayField
					{...this.props}
					schema={{...this.props.schema, items: itemSchema}}
					formData={formData}
					uiSchema={{...this.props.uiSchema, items: itemUiSchema}}
					onChange={this.onChange}
					registry={{...this.props.registry, ArrayFieldTemplate: TemplateArrayFieldTemplate}}
				/>
			</div>
		);
	}

	onChange(formData) {
		const fields = Object.keys(this.props.schema.items.properties);

		formData = formData.reduce((array, value) => {
			let hasAllFields = true;
			for (let f in fields) {
				if (value[fields[f]] === undefined) hasAllFields = false;
			}
			if (hasAllFields) array.push({...value});
			return array;
		}, []);

		this.props.onChange(formData);
	}
}

function TemplateArrayFieldTemplate(props) {
	return (
		<div>
			{props.items.map((item) => {
				return (
					<div key={item.index} className="laji-form-field-template-item keep-vertical">
						<div className="laji-form-field-template-schema">{item.children}</div>
					</div>
				);
			})}
		</div>
	);
}
