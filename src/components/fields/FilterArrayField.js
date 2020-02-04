import { Component } from "react";
import { checkArrayRules, getUiOptions } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class FilterArrayField extends Component {

	static getName() {return "FilterArrayField";}

	getStateFromProps(props, origProps) {
		this.cache = this.cache || {};
		const {rules, cache} = getUiOptions(origProps.uiSchema);
		return {
			...props,
			formData: (props.formData || []).filter((_, idx) => {
				if (cache) {
					const {passes, cache: _cache} = checkArrayRules(rules, {formData: props.formData}, idx, this.cache);
					this.cache = _cache;
					return passes;
				} else {
					return checkArrayRules(rules, {formData: props.formData}, idx);
				}
			})
		};
	}
}
