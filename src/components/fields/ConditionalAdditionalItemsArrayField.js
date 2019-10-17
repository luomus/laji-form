import { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import VirtualSchemaField from "../VirtualSchemaField";
import { rulePropType, operationPropType, computeUiSchema } from "./ConditionalUiSchemaField";
import { checkRules } from "../../utils";

/**
 * Makes the items under the given rules to be array items and the rest of the items to be additionalItems.
 * uischema = {"ui:options": {
 *  	rules: see the documentation of ConditionalUiSchemaField rules.
 *  	itemsOperations: see the documentation of ConditionalUiSchemaField operations.
 *  	cache: See the documentation of ConditionalUiSchemaField cache.
 * }}
 **/
@VirtualSchemaField
export default class ConditionalAdditionalItemsArrayField extends Component {
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

	static getName() {return "ConditionalAdditionalItemsArrayField";}

	cache = {};

	getStateFromProps(props) {
		let {rules = [], itemsOperations, additionalItemsOperations, cache = true, arrayMerge} = this.getUiOptions();

		let items = [];
		let additionalItems = [];
		(props.formData || []).forEach((item, idx) => {
			let passes;
			if (cache) {
				const check = checkRules(rules, {formData: props.formData[idx]}, this.cache);
				const {cache}  = check;
				passes = check.passes;
				this.cache = cache;
			} else {
				passes = checkRules(rules, {formData: props.formData[idx]});
			}

			if (passes) {
				items.push(item);
			} else {
				additionalItems.push(item);
			}
		});

		let {schema} = props;
		const itemSchema = props.schema.items;

		let uiSchemaUpdate, formData;
		if (items.length) {
			schema = update(schema, {items: {$set: Array(items.length).fill(itemSchema)}});
			schema = update(schema, {additionalItems: {$set: itemSchema}});
			uiSchemaUpdate = {
				items: {$set: computeUiSchema(props.uiSchema.items, itemsOperations, arrayMerge)},
				additionalItems: {$set: computeUiSchema(props.uiSchema.items, additionalItemsOperations, arrayMerge)}
			};
			formData = [...items, ...additionalItems];
		} else {
			schema = update(schema, {items: {$set: itemSchema}});
			uiSchemaUpdate =  {
				items: {$set: computeUiSchema(props.uiSchema.items, additionalItemsOperations, arrayMerge)}
			};
			formData = additionalItems;
		}

		const uiSchema = update(props.uiSchema, uiSchemaUpdate);
		return {...props, schema, uiSchema, formData};
	}
}
