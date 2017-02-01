import React, { Component } from "react";
import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";
import { getUiOptions } from "../../utils";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils"

export default class _ArrayField extends Component {
	constructor(props) {
		super(props);
		this.onCopy = this.onCopy.bind(this);
	}

	render() {
		const {props} = this;
		let {schema} = props;
		if (props.uiSchema.items && props.uiSchema.items["ui:field"]) {
			schema = {...schema, uniqueItems: false};
		}
		const buttons = (getUiOptions(props.uiSchema).buttons || []).map(button => {
			const fnName = button.fn;
			return (this.buttonDefinitions[fnName]) ?
				{...this.buttonDefinitions[fnName], ...button , fn: this.buttonDefinitions[fnName].fn, fnName} :
				button;
		});

		return <ArrayField
			{...props}
			schema={schema}
			uiSchema={{...props.uiSchema, "ui:options": {orderable: false, ...props.uiSchema["ui:options"], buttons}}}
		/>
	}

	buttonDefinitions = {
		copy: {
			glyph: "duplicate",
			fn: e => this.onCopy
		}
	}

	onCopy(props, {type, filter}) {
		const filterDict = filter.reduce((dict, f) => {
			dict[f] = true;
			return dict;
		}, {});

		const fieldsFilter = (type === "blacklist") ? field => !filterDict[field] : field => filterDict[field];
		const fields = Object.keys(this.props.schema.items.properties).filter(fieldsFilter);
		const nestedFilters = filter.filter(f => f.includes("/"));

		const {formData} = this.props;
		const defaultItem = getDefaultFormState(this.props.schema.items, undefined, this.props.registry);

		const lastIdx = formData.length - 1;
		const lastItem = formData[lastIdx];

		function clone(field) {
			if (!field) return field;
			return JSON.parse(JSON.stringify(field));
		}

		const copyItem = lastIdx >= 0 ? (() => {
				return fields.reduce((item, field) => {
					item[field] = clone(lastItem[field]);
					return item;
				}, defaultItem)
			})() : defaultItem;

		nestedFilters.forEach(filter => {
			const splitted = filter.substring(1).split("/");
			const last = splitted.pop();

			const nested = splitted.reduce((_nested, path) => {
				_nested = copyItem[path];
				return Array.isArray(_nested) ? _nested[0] : _nested;
			}, copyItem);

			if (type === "blacklist") {
				const nestedSchema = splitted.reduce((nested, path) => {
					if (nested.properties) return nested.properties[path];
					if (nested.items) return nested.items.properties[path];
					if (nested[path]) return nested[path];
				}, this.props.schema.items);

				if (nested) nested[last] = getDefaultFormState(nestedSchema, undefined, this.props.registry);
			} else {
				const origNestedField = splitted.reduce((nested, path) => {
					if (nested) return nested[path];
					else if (nested && nested[0]) return nested[0][path];
					return undefined;
				}, lastItem);
				if (nested) nested[last] = origNestedField;
			}
		});

		this.props.onChange([
			...this.props.formData,
			copyItem
		]);
	}
}