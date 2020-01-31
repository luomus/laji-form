import React, { Component } from "react";
import PropTypes from "prop-types";
import { rulePropType, operationPropType, computeUiSchema } from "./ConditionalUiSchemaField";
import { checkArrayRules, getInnerUiSchema, getUiOptions, getUUID, updateSafelyWithJSONPointer, findNearestParentTabbableElem } from "../../utils";
import BaseComponent from "../BaseComponent";
import Context from "../../Context";
//import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";
import { arrayKeyFunctions } from "../ArrayFieldTemplate";
//import { toIdSchema } from "react-jsonschema-form/lib/utils";

@BaseComponent
export default class MultiArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				rules: PropTypes.oneOfType([
					rulePropType,
					PropTypes.arrayOf(rulePropType)
				]),
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
	arrayFieldIdHashes = [];

	render() {
		const {props} = this;
		let {groups, cache = true, arrayMerge, persistenceKey, renderNonGrouped = false, nonGroupedOperations = {}} = getUiOptions(this.props.uiSchema);
		if (groups.length && !this.cache) {
			this.cache = Array(groups.length).fill(undefined).map(_ => ({})); // eslint-disable-line no-unused-vars
			this.arrayKeyFunctions = Array(groups.length + 1).fill(undefined).map((_, idx) => getArrayKeyFunctions(this, idx));
		}

		if (groups.length && !this.groupItemIds) {
			const getGroupItemIds = () => Array(groups.length + 1).fill(undefined).map(_ => ({})); // eslint-disable-line no-unused-vars
			if (typeof persistenceKey === "string") {
				const context = new Context(`${persistenceKey}_MULTI`);
				this.groupItemIds = context.groupItemIds || getGroupItemIds();
				context.groupItemIds = this.groupItemIds;
			} else {
				this.groupItemIds = getGroupItemIds();
			}
		}

		const itemGroups = Array(groups.length + 1).fill(undefined).map(_ => []);  // eslint-disable-line no-unused-vars
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

		//this.ArrayFieldIdFixed = Array(groups.length + 1).fill(undefined).map((_, idx) => {
		//	let offset = 0;
		//	for (let i = 0; i < idx; i++) {
		//		offset += this.groupedItems[i].length;
		//	}
		//	const hash = offset;
		//	const [_hash] = this.arrayFieldIdHashes[idx] || [];
		//	if (_hash !== hash) {
		//		this.arrayFieldIdHashes[idx] = [hash, getArrayFieldIdFixed(this, idx)];
		//	}
		//	return this.arrayFieldIdHashes[idx][1];
		//});

		return (renderNonGrouped ? groupedItems : withoutNonGrouped).map((items, idx) => {
			const operations = renderNonGrouped && idx === groupedItems.length - 1
				? nonGroupedOperations
				: groups[idx].operations;
			const innerUiSchema = getInnerUiSchema(props.uiSchema);
			let uiSchema = operations
				? computeUiSchema(innerUiSchema, operations, arrayMerge)
				: innerUiSchema;

			uiSchema = updateSafelyWithJSONPointer(uiSchema, this.arrayKeyFunctions[idx], "/ui:options/arrayKeyFunctions");

			let offset = 0;
			for (let i = 0; i < idx; i++) {
				offset += this.groupedItems[i].length;
			}

			uiSchema = {...uiSchema, "ui:options": {...getUiOptions(uiSchema), startIdx: offset}};

			//const formContext = {...this.props.formContext, ArrayField: this.ArrayFieldIdFixed[idx]};

			const {SchemaField} = this.props.registry.fields;
			return (
				<React.Fragment key={`${idx}-${this.groupedItems[idx].length}-${offset}`}>
					<SchemaField
						{...props}
					//formContext={formContext}
					//registry={{...this.props.registry, formContext}}
						uiSchema={uiSchema}
						formData={items}
						onChange={this.onChange(idx)}
					/>
				</React.Fragment>
			);
		});
	}

	onChange = (idx) => (formData) => {
		let offset = 0;
		for (let i = 0; i < idx; i++) {
			offset += Object.keys(this.groupedItems[i]).length;
		}
		let {persistenceKey} = getUiOptions(this.props.uiSchema);
		if (typeof persistenceKey === "string" && formData.length !== this.groupedItems[idx].length) {
			const context = new Context(`${persistenceKey}_MULTI`);
			context.addedToGroup = idx;
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
			const {startIdx, } = getUiOptions(props.uiSchema);
			if (itemIdx < startIdx || itemIdx >= startIdx + props.formData.length) {
				return false;
			}
			return _arrayKeyFunctions.insert(e, _props);
		},
		navigateArray: (e, options) => {
			const _options = {...options, getProps: () => ({...options.getProps(), formData: that.props.formData})};
			return _arrayKeyFunctions.navigateArray(e, _options);
		}
	};};

//const getArrayFieldIdFixed = (that, idx) => {
//	function ArrayFieldIdFixed(props) {
//		ArrayField.call(this, props);
//	}
//	ArrayFieldIdFixed.prototype = Object.create(ArrayField.prototype);
//	ArrayFieldIdFixed.prototype.constructor = ArrayFieldIdFixed;
//	ArrayFieldIdFixed.prototype.renderArrayFieldItem = function(props) {
//		const idWithoutIdx = props.itemIdSchema.$id.replace(/(.*)_[0-9]+/, "$1");
//		let offset = 0;
//		for (let i = 0; i < idx; i++) {
//			offset += Object.keys(that.groupedItems[i]).length;
//		}
//		const index = offset + props.index;
//		const idSchema = toIdSchema(props.itemSchema, `${idWithoutIdx}_${index}`, that.props.registry.definitions, props.item, that.props.idPrefix);
//		return ArrayField.prototype.renderArrayFieldItem.call(this, {...props, itemIdSchema: idSchema});
//	};
//	//return customButtonsHandling(ArrayFieldIdFixed);
//	return ArrayFieldIdFixed;
//};