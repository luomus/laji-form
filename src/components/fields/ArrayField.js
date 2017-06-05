import React, { Component } from "react";
import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";
import { getUiOptions } from "../../utils";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import BaseComponent from "../BaseComponent";

@BaseComponent
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

		function rulesSatisfied(btn) {
			return Object.keys(btn.rules || {}).every(ruleName => {
				const ruleVal = btn.rules[ruleName];
				if (ruleName === "minLength") {
					return (props.formData || []).length >= ruleVal;
				}
			});
		}

		const buttons = (getUiOptions(props.uiSchema).buttons || []).map(button => {
			const fnName = button.fn;
			if (this.buttonDefinitions[fnName]) {
				return rulesSatisfied(this.buttonDefinitions[fnName]) ?
					{...this.buttonDefinitions[fnName], ...button , fn: this.buttonDefinitions[fnName].fn, fnName} :
					null;
			} else {
				return button;
			}
		}).filter(btn => btn);

		return <ArrayField
			{...props}
			schema={schema}
			uiSchema={{...props.uiSchema, "ui:options": {orderable: false, ...props.uiSchema["ui:options"], buttons}}}
		/>;
	}

	buttonDefinitions = {
		copy: {
			glyph: "duplicate",
			fn: () => this.onCopy,
			rules: {
				minLength:  1
			}
		}
	}

	onCopy(props, {type, filter}) {
		const nestedFilters = filter.filter(f => f.includes("/"));

		const {formData} = this.props;
		const defaultItem = getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions);

		const lastIdx = formData.length - 1;
		const lastItem = formData[lastIdx];

		const copyItem = lastIdx >= 0 ? Object.assign(defaultItem, lastItem) : defaultItem;

		nestedFilters.forEach(filter => {
			const splitted = filter.substring(1).split("/");
			const last = splitted.pop();

			const nested = splitted.reduce((_nested, path) => {
				_nested = copyItem[path];
				return _nested;
			}, copyItem);
			if (type === "blacklist") {
				const nestedSchema = splitted.reduce((nested, path) => {
					if ("properties" in nested) return nested.properties[path];
					if ("items" in nested) return nested.items.properties[path];
					if (path in nested) return nested[path];
				}, this.props.schema.items);

				if (nested) nested[last] = getDefaultFormState(nestedSchema, undefined, this.props.registry.definitions);
			} else {
				const origNestedField = splitted.reduce((nested, path) => {
					if (nested !== undefined) return nested[path];
					else if (nested && nested[0] !== undefined) return nested[0][path];
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
