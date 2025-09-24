import * as React from "react";
import * as PropTypes from "prop-types";
import { checkArrayRules, getUiOptions, getInnerUiSchema } from "../../utils";
import { rulePropType } from "./ConditionalUiSchemaField";
import BaseComponent from "../BaseComponent";

const arrayRulePropType = PropTypes.shape({
	idx: PropTypes.number,
	isLast: PropTypes.number,
	complement: PropTypes.bool
});

export const arrayRulesPropType = PropTypes.oneOfType([
	rulePropType,
	arrayRulePropType,
	PropTypes.arrayOf(PropTypes.oneOfType([rulePropType, arrayRulePropType]))
]);

@BaseComponent
export default class FilterArrayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: arrayRulesPropType,
				cache: PropTypes.bool
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	};
	getStateFromProps(props) {
		if (props.schema.items.type !== "object") {
			throw new Error("Can't use FilterArrayField if items aren't objects");
		}
		this.cache = this.cache || {};
		const {rules, cache} = getUiOptions(props.uiSchema);
		this.filteredIdxs = {};
		this.filteredToOffsets = {};
		this.idxToOffsets = {};
		let filteredCount = 0;
		const store = (idx, item) => {
			this.filteredIdxs[idx] = item;
			filteredCount++;
		};
		const formData = (props.formData || []).filter((item, idx) => {
			let passes;
			if (cache) {
				const {passes: _passes, cache: _cache} = checkArrayRules(rules, {formData: props.formData}, idx, this.cache);
				passes = _passes;
				this.cache = _cache;
				!passes && store(idx, item);
			} else {
				passes = checkArrayRules(rules, {formData: props.formData}, idx);
				!passes && store(idx, item);
			}
			if (passes) {
				this.filteredToOffsets[idx - filteredCount] = filteredCount;
				this.filteredToOffsets[`_${idx}`] =  filteredCount;
			}
			this.idxToOffsets[idx] = filteredCount;
			return passes;
		});
		this.filteredTotal = filteredCount;
		const errorSchema = Object.keys(props.errorSchema).reduce((errorSchema, idx) => {
			errorSchema[idx - this.idxToOffsets[idx]] = props.errorSchema[idx];
			return errorSchema;
		}, {});


		const innerUiSchema = getInnerUiSchema(props.uiSchema);
		const uiSchema = {
			...innerUiSchema,
			"ui:options": this.getActiveProps({
				...getUiOptions(innerUiSchema),
				idxOffsets: this.filteredToOffsets,
				totalOffset: this.filteredTotal,
			})
		};

		return {
			...props,
			formData,
			uiSchema,
			errorSchema,
			onChange: this.onChange,
		};
	}

	getActiveProps(options) {
		const {onActiveChange, activeIdx} = options;
		if (onActiveChange) {
			if (this.cachedOnActiveChange !== onActiveChange) {
				this.cachedOnActiveChange = onActiveChange;
			}
			options = {
				...options,
				onActiveChange: this.getOnActiveChange
			};
		}
		if (activeIdx !== undefined) {
			options = {
				...options,
				activeIdx: options.activeIdx - this.idxToOffsets[options.activeIdx]
			};
		}
		return options;
	}

	getOnActiveChange = (idx, prop, callback) => {
		const offset = idx === undefined 
			? 0
			: (idx in this.filteredToOffsets)
				? this.filteredToOffsets[idx]
				: this.filteredTotal;
		this.cachedOnActiveChange(idx === undefined ? undefined : idx + offset, prop, callback);
	};

	onChange = (formData) => {
		this.props.onChange(Object.keys(this.filteredIdxs).sort().reduce((_formData, idx) => {
			const updated = [..._formData];
			updated.splice(idx, 0, this.filteredIdxs[idx]);
			return updated;
		},
		formData
		));
	};

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return <SchemaField {...this.props} {...this.state} />;
	}
}
