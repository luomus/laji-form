import React, { Component } from "react";
import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import merge from "deepmerge";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";

export const copyItemFunction = (that, copyItem) => (props, {type, filter}) => {
	const nestedFilters = filter;

	const {schema, registry} = that.props;
	const defaultItem = getDefaultFormState(schema.items, copyItem, registry.definitions);

	nestedFilters.forEach(filter => {
		const splitted = filter.includes("/") ? filter.substring(1).split("/") : [filter];
		const last = splitted.pop();

		const nested = splitted.reduce((_nested, path) => {
			return (typeof _nested === "object" && _nested !== null) ? _nested[path] : undefined;
		}, defaultItem);
		if (type === "blacklist") {
			const nestedSchema = [...splitted, last].reduce((nested, path) => {
				let item = nested;
				while (true) {
					let copyItem = item;
					if (typeof item === "object" && item !== null) {
						if (item.type === "object" && "properties" in item) {
							item = item.properties;
						} else if (item.type === "array" && "items" in item) {
							item =  item.items;
						}
					}
					if (item === copyItem) break;
				}
				return (path in item) ? item[path] : item;
			}, schema.items);

			if (nested) nested[last] = getDefaultFormState(nestedSchema, undefined, registry.definitions);
		} else {
			const origNestedField = splitted.reduce((nested, path) => {
				if (nested !== undefined) return nested[path];
				else if (nested && nested[0] !== undefined) return nested[0][path];
				return undefined;
			}, copyItem);
			if (nested) nested[last] = origNestedField;
		}
	});

	return defaultItem;
};

@BaseComponent
export default class _ArrayField extends Component {
	render() {
		const {props} = this;
		let {schema} = props;
		if (props.uiSchema.items && props.uiSchema.items["ui:field"]) {
			schema = {...schema, uniqueItems: false};
		}

		return <ArrayField
			{...props}
			schema={schema}
			uiSchema={{
				...props.uiSchema, 
				"ui:options": {
					orderable: false, 
					...props.uiSchema["ui:options"], 
					buttonDefinitions: props.uiSchema["ui:options"].buttonDefinitions ? 
						merge(this.buttonDefinitions, getUiOptions(props.uiSchema).buttonDefinitions) :
						this.buttonDefinitions
				}
			}}
		/>;
	}

	buttonDefinitions = {
		copy: {
			glyph: "duplicate",
			fn: () => (...params) => {
				this.props.onChange([
					...this.props.formData,
					copyItemFunction(this, this.props.formData[this.props.formData.length  - 1])(...params)
				]);
			},
			rules: {
				minLength:  1
			}
		}
	}
}
