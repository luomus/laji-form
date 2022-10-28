import * as React from "react";
import * as PropTypes from "prop-types";
import { rulesPropType, operationPropType, computeUiSchema } from "./ConditionalUiSchemaField";
import { checkArrayRules, getInnerUiSchema, getUiOptions, getUUID, updateSafelyWithJSONPointer, findNearestParentTabbableElem } from "../../utils";
import BaseComponent from "../BaseComponent";
import Context from "../../Context";
import { arrayKeyFunctions } from "../templates/ArrayFieldTemplate";

@BaseComponent
export default class MultiArrayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: rulesPropType,
				itemsOperations: PropTypes.oneOfType([
					operationPropType,
					PropTypes.arrayOf(operationPropType)
				]),
				cache: PropTypes.boolean
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	itemIds = {}

	render() {
		const {props} = this;
		let {groups, cache = true, arrayMerge, persistByParent, persistenceKey, renderNonGrouped = false, nonGroupedOperations} = getUiOptions(this.props.uiSchema);
		if (groups.length && !this.cache) {
			this.cache = Array(groups.length).fill(undefined).map(_ => ({})); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
		if (groups.length) {
			this.arrayKeyFunctions = Array(groups.length + 1).fill(undefined).map((_, idx) => getArrayKeyFunctions(this, idx));
		}

		if (groups.length && !this.groupItemIds) {
			const getGroupItemIds = () => Array(groups.length + 1).fill(undefined).map(_ => ({})); // eslint-disable-line @typescript-eslint/no-unused-vars
			if (persistByParent) {
				const parentId = this.props.formContext._parentLajiFormId;
				const context = new Context(`${parentId}_MULTI`);
				this.groupItemIds = context.groupItemIds || getGroupItemIds();
				context.groupItemIds = this.groupItemIds;
			} else if (typeof persistenceKey === "string") {
				const context = new Context(`${persistenceKey}_MULTI`);
				this.groupItemIds = context.groupItemIds || getGroupItemIds();
				context.groupItemIds = this.groupItemIds;
			} else {
				this.groupItemIds = getGroupItemIds();
			}
		}

		const itemGroups = Array(groups.length + 1).fill(undefined).map(_ => []);  // eslint-disable-line @typescript-eslint/no-unused-vars
		const addToGroup = (idx, item) => {
			const id = getUUID(item);
			itemGroups[idx].push(item);
			this.groupItemIds[idx][id] = true;
			this.itemIds[id] = true;
			return true;
		};

		(props.formData || []).forEach(item => {
			this.groupItemIds.forEach((_, groupIdx) => {
				if (this.groupItemIds[groupIdx][getUUID(item)]) {
					addToGroup(groupIdx, item);
				}
			});
		});

		const nonGrouped = [];
		const groupedItems = (props.formData || []).reduce((itemGroups, item, idx) => {
			const addedToGroup = groups.some((group, groupIdx) => {
				if (this.itemIds[getUUID(item)]) {
					return true;
				}

				const {rules = []} = group; 
				let passes;
				if (cache) {
					const check = checkArrayRules(rules, {formData: props.formData || []}, idx, this.cache[groupIdx]);
					const {cache}  = check;
					passes = check.passes;
					this.cache[groupIdx] = cache;
				} else {
					passes = checkArrayRules(rules, {formData: props.formData || []}, idx);
				}

				if (passes) {
					return addToGroup(groupIdx, item);
				}
			});

			if (!addedToGroup) {
				nonGrouped.push([item, idx]);
			}
			return itemGroups;
		}, itemGroups);

		nonGrouped.forEach(([item, idx]) => {
			const context = new Context(`${persistenceKey}_MULTI`);
			const groupIdx = this.groupItemIds.length - 1;
			if (typeof persistenceKey === "string" && (context.nonGroupedMap || {})[idx] !== undefined && this.groupItemIds[groupIdx]) {
				addToGroup(context.nonGroupedMap[idx], item);
			} else {
				addToGroup(groupIdx, item);
			}
		});

		this.groupedItems = groupedItems;
		const withoutNonGrouped = [...groupedItems];
		withoutNonGrouped.pop();

		let offset = 0;
		const offsets = (renderNonGrouped ? groupedItems : withoutNonGrouped).map((group, idx) => {
			let idxOffsets;
			if (!idx) {
				idxOffsets = {};
			} else {
				idxOffsets = group.reduce((g, i, _idx) => {
					g[_idx] = offset;
					return  g;
				}, {});
			}
			offset += group.length;
			return idxOffsets;
		}, []);

		return (renderNonGrouped ? groupedItems : withoutNonGrouped).map((items, idx) => {
			const operations = renderNonGrouped && idx === groupedItems.length - 1
				? nonGroupedOperations
				: groups[idx].operations;
			const innerUiSchema = getInnerUiSchema(props.uiSchema);
			let uiSchema = operations
				? computeUiSchema(innerUiSchema, operations, arrayMerge)
				: innerUiSchema;

			uiSchema = updateSafelyWithJSONPointer(uiSchema, this.arrayKeyFunctions[idx], "/ui:options/arrayKeyFunctions");
			uiSchema = updateSafelyWithJSONPointer(uiSchema, offsets[idx], "/ui:options/idxOffsets");

			let offset = 0;
			for (let i = 0; i < idx; i++) {
				offset += this.groupedItems[i].length;
			}

			uiSchema = {...uiSchema, "ui:options": {...getUiOptions(uiSchema), startIdx: offset}};
			const errorSchema = {};
			for (const key in props.errorSchema) {
				if (key >= offset && key < offset + this.groupedItems[idx].length) {
					errorSchema[key - offset] = {...props.errorSchema[key]};
				}
			}

			const {SchemaField} = this.props.registry.fields;
			return (
				<SchemaField
					key={idx}
					{...props}
					uiSchema={uiSchema}
					errorSchema={errorSchema}
					formData={items}
					onChange={this.onChange(idx)}
				/>
			);
		});
	}

	onChange = (idx) => (formData) => {
		let offset = 0;
		for (let i = 0; i < idx; i++) {
			offset += Object.keys(this.groupedItems[i]).length;
		}
		let {persistenceKey} = getUiOptions(this.props.uiSchema);
		const lengthChange = formData.length - this.groupedItems[idx].length;
		const context = new Context(`${persistenceKey}_MULTI`);

		// Fix idxs map for items after this group.
		if (lengthChange && context.nonGroupedMap) {
			const changes = {};
			const changeFrom = {};
			for (let i = offset + Object.keys(this.groupedItems[idx]).length; i < (this.props.formData || []).length; i++) {
				if (context.nonGroupedMap[i]) {
					changes[i + lengthChange] = context.nonGroupedMap[i];
					changeFrom[i] = true;
				}
			}
			context.nonGroupedMap = {...context.nonGroupedMap, ...changes};
			Object.keys(changeFrom).filter(idx => !(idx in changes)).forEach(idx => {
				delete context.nonGroupedMap[idx];
			});
		}

		if (typeof persistenceKey === "string" && formData.length !== this.groupedItems[idx].length) {
			if (!context.nonGroupedMap) {
				context.nonGroupedMap = {};
			}
			context.nonGroupedMap[offset + formData.length - 1] = idx;
		}

		formData.forEach(item => {
			this.groupItemIds[idx][getUUID(item)] = true;
		});
		const newFormData = this.groupedItems.reduce((flat, groupItems, _idx) => {
			if (_idx === idx) return [...flat, ...formData];
			return [...flat, ...groupItems];
		}, []);
		this.props.onChange(newFormData);
	}
}

const getArrayKeyFunctions = (that) => {
	const {arrayKeyFunctions: optionsArrayKeyFunctions} = getUiOptions(that.props.uiSchema);
	const _arrayKeyFunctions = optionsArrayKeyFunctions || arrayKeyFunctions;
	return {
		..._arrayKeyFunctions,
		insert: (e, _props) => {
			const props = _props.getProps();
			const inputElem = findNearestParentTabbableElem(document.activeElement);
			if (!inputElem) {
				return false;
			}
			if (!inputElem.id.startsWith(props.idSchema.$id)) {
				return false;
			}
			const itemIdx = inputElem.id.replace(props.idSchema.$id, "").replace(/^_?([0-9]+).*$/, "$1");
			const {startIdx} = getUiOptions(props.uiSchema);
			if (itemIdx < startIdx || itemIdx >= startIdx + (props.formData || []).length) {
				return false;
			}
			return _arrayKeyFunctions.insert(e, _props);
		},
		navigateArray: (e, options) => {
			const _options = {...options, getProps: () => ({...options.getProps(), formData: that.props.formData})};
			return _arrayKeyFunctions.navigateArray(e, _options);
		}
	};
};
