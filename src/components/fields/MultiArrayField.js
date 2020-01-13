import React, { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { rulePropType, operationPropType, computeUiSchema } from "./ConditionalUiSchemaField";
import { checkRules, getInnerUiSchema, getUiOptions, getUUID, updateSafelyWithJSONPointer } from "../../utils";
import BaseComponent from "../BaseComponent";
import { Row, Col } from "react-bootstrap";
import Context from "../../Context";
import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";
import { toIdSchema } from "react-jsonschema-form/lib/utils";

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
		formData: PropTypes.array.isRequired
	}

	itemIds = {}

	render() {
		const {props} = this;
		let {groups, cache = true, arrayMerge, persistenceKey} = getUiOptions(this.props.uiSchema);
		if (groups.length && !this.cache) {
			this.cache = Array(groups.length).fill(undefined).map(_ => ({}));
			this.ArrayFieldIdFixed = Array(groups.length + 1).fill(undefined).map((_, idx) => (getArrayFieldIdFixed(this, idx)));
		}
		if (groups.length && !this.groupItemIds) {
			const getGroupItemIds = () => Array(groups.length + 1).fill(undefined).map(_ => ({}));
			if (typeof persistenceKey === "string") {
				const context = new Context(`${persistenceKey}_MULTI`);
				this.groupItemIds = context.groupItemIds || getGroupItemIds();
				context.groupItemIds = this.groupItemIds;
			} else {
				this.groupItemIds = getGroupItemIds();
			}
		}

		const itemGroups = Array(groups.length + 1).fill(undefined).map(_ => []); 
		const addToGroup = (idx, item) => {
			const id = getUUID(item);
			itemGroups[idx].push(item);
			this.groupItemIds[idx][id] = true;
			this.itemIds[id] = true;
			return true;
		};

		const nonGrouped = [];
		const groupedItems = (props.formData || []).reduce((itemGroups, item, idx) => {
			const addedToGroup = groups.some((group, groupIdx) => {
				if (this.groupItemIds[groupIdx][getUUID(item)]) {
					return addToGroup(groupIdx, item);
				}

				const {rules = []} = group; 
				let passes;
				if (cache) {
					const check = checkRules(rules, {formData: item}, this.cache[groupIdx]);
					const {cache}  = check;
					passes = check.passes;
					this.cache[groupIdx] = cache;
				} else {
					passes = checkRules(rules, {formData: item});
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
		return groupedItems.map((items, idx) => {
			const {operations} = groups[idx] || {};
			const innerUiSchema = getInnerUiSchema(props.uiSchema);
			let uiSchema = operations
				? update(innerUiSchema, {$set: computeUiSchema(props.uiSchema, operations, arrayMerge)})
				: innerUiSchema;

			//uiSchema = updateSafelyWithJSONPointer(uiSchema, {add: {beforeAdd: "flash"}}, "/ui:options/buttonDefinitions");

			let offset = 0;
			for (let i = 0; i < idx; i++) {
				offset += this.groupedItems[i].length;
			}

			uiSchema = {...uiSchema, "ui:options": {...getUiOptions(uiSchema), startIdx: offset}};

			const formContext = {...this.props.formContext, ArrayField: this.ArrayFieldIdFixed[idx]};

			const {SchemaField} = this.props.registry.fields;
			return (
				<Row key={`${idx}-${this.groupedItems[idx].length}-${offset}`}><Col xs={12}>
					<SchemaField
						{...props}
						formContext={formContext}
						registry={{...this.props.registry, formContext}}
						uiSchema={uiSchema}
						formData={items}
						onChange={this.onChange(idx)}
					/>
				</Col></Row>
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

const getArrayFieldIdFixed = (that, idx) => {
	function ArrayFieldIdFixed(props) {
		ArrayField.call(this, props);
	}
	ArrayFieldIdFixed.prototype = Object.create(ArrayField.prototype);
	ArrayFieldIdFixed.prototype.constructor = ArrayFieldIdFixed;
	ArrayFieldIdFixed.prototype.renderArrayFieldItem = function(props) {
		const idWithoutIdx = props.itemIdSchema.$id.replace(/(.*)_[0-9]+/, "$1");
		let offset = 0;
		for (let i = 0; i < idx; i++) {
			offset += Object.keys(that.groupedItems[i]).length;
		}
		const index = offset + props.index;
		const idSchema = toIdSchema(props.itemSchema, `${idWithoutIdx}_${index}`, that.props.registry.definitions, props.item, that.props.idPrefix);
		return ArrayField.prototype.renderArrayFieldItem.call(this, {...props, itemIdSchema: idSchema});
	};
	return ArrayFieldIdFixed;
};
