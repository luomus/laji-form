import { Component } from "react";
import { checkArrayRules, getUiOptions } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class FilterArrayField extends Component {

	static getName() {return "FilterArrayField";}

	getStateFromProps(props, origProps) {
		if (props.schema.items.type !== "object") {
			throw new Error("Can't use FilterArrayField if items aren't objects");
		}
		this.cache = this.cache || {};
		const {rules, cache} = getUiOptions(origProps.uiSchema);
		this.filteredIdxs = {};
		const store = (idx, item) => {
			this.filteredIdxs[idx] = item;
		};
		return {
			...props,
			formData: (props.formData || []).filter((item, idx) => {
				if (cache) {
					const {passes, cache: _cache} = checkArrayRules(rules, {formData: props.formData}, idx, this.cache);
					this.cache = _cache;
					!passes && store(idx, item);
					return passes;
				} else {
					const passes =checkArrayRules(rules, {formData: props.formData}, idx);
					!passes && store(idx, item);
					return passes;
				}
			}),
			onChange: this.onChange
		};
	}

	onChange = (formData) => {
		this.props.onChange(Object.keys(this.filteredIdxs).sort().reduce((_formData, idx) => {
			const updated = [..._formData];
			updated.splice(idx, 0, this.filteredIdxs[idx]);
			return updated;
		},
			formData
		));
	}
}
