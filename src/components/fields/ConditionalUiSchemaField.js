import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import * as deepmerge from "deepmerge";
import { checkRules, updateSafelyWithJSONPointer } from "../../utils";

export const rulePropType = PropTypes.oneOfType([
	PropTypes.shape({
		container: PropTypes.string,
		field: PropTypes.string.isRequired,
		regexp: PropTypes.string,
		valueIn: PropTypes.arrayOf(PropTypes.string),
		valueLengthLessThan: PropTypes.number,
		complement: PropTypes.bool
	}),
	PropTypes.shape({
		rule: PropTypes.oneOf(["isAdmin", "isEdit"]),
		complement: PropTypes.bool
	}),
	PropTypes.oneOf(["isAdmin", "isEdit"])
]);

export const operationPropType = PropTypes.shape({
	type: PropTypes.oneOf(["merge", "wrap"]),
	uiSchema: PropTypes.object.isRequired,
});

export const rulesPropType = PropTypes.oneOfType([
	rulePropType,
	PropTypes.arrayOf(rulePropType)
]);

const casePropType = PropTypes.shape({
	rules: rulesPropType,
	operations: PropTypes.oneOfType([
		operationPropType,
		PropTypes.arrayOf(operationPropType)
	])
});

/**
 * Transforms uiSchema according to conditional cases. Cases are not mutually exclusive.
 * uiSchema = {"ui:options": {
 *	cases: [
 *		rules: [
 *			{
 *				regexp: The regexp that the field must match.
 *				valueIn: An array that the field must be in.
 *				field: The field that the rule is being checked on (can be a JSON pointer or a field name)
 *			}
 *		],
 *		operations: [ // All the operations are performed if all rules pass.
 *			{
 *				type: "merge" or "wrap" "replace". "merge" deeply merges the conditional uiSchema to the nested uiSchema.
 *				                                   "wrap" sets the nested uiSchema inside conditional uiSchema.
 *				                                   "replace" (default) replaces nested uiSchema with conditional uiSchema.
 *				uiSchema: conditional uiSchema to use.
 *			}
 *		],
 *		else: [<same as operations>] // Operations performed if the rules do not pass.
 *		cache: <boolean> true by default. If you know the cases will cache, set this to false.
 *		       There will be a performance penalty on valueIn rule, as they are not indexed without caching.
 *	]
 * }
 * uiSchema: nested uiSchema
 * }
 */
@VirtualSchemaField
export default class ConditionalUiSchemaField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				cases: PropTypes.oneOfType([
					casePropType,
					PropTypes.arrayOf(casePropType)
				]),
				cache: PropTypes.bool
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array", "object", "string", "integer", "number", "boolean"])
		}).isRequired,
	}

	static getName() {return "ConditionalUiSchemaField";}

	cache = {};

	getStateFromProps(props) {
		const {cases = [], cache = true, arrayMerge} = this.getUiOptions();

		const {uiSchema} = props;

		let computedUiSchema = uiSchema;
		(Array.isArray(cases) ? cases : [cases]).forEach(({rules = [], operations = [], else: _else, arrayMerge: _arrayMerge}, idx) => {
			let passes;
			if (cache) {
				if (!this.cache[idx]) {
					this.cache[idx] = {};
				}
				const check = checkRules(rules, props, this.cache[idx]);
				const {cache}  = check;
				passes = check.passes;
				this.cache = cache;
			} else {
				passes = checkRules(rules, props);
			}

			if (passes)  {
				computedUiSchema = computeUiSchema(computedUiSchema, operations, _arrayMerge || arrayMerge);
			} else if (_else) {
				computedUiSchema = computeUiSchema(computedUiSchema, _else, _arrayMerge || arrayMerge);
			}
		});

		return {uiSchema: computedUiSchema};
	}
}

export const computeUiSchema = (uiSchema, operations, arrayMerge = "replace") => {
	if (!operations) return uiSchema;
	return (Array.isArray(operations) ? operations : [operations]).reduce((_uiSchema, op) => {
		switch (op.type) {
		case "merge":
			uiSchema = deepmerge(uiSchema, op.uiSchema, {arrayMerge: arrayMerge === "replace"
				? (a1, a2) => a2
				: (a1, a2) => [...a1, ...a2]});
			break;
		case "wrap":
			uiSchema = {...op.uiSchema, uiSchema};
			break;
		case "jsonPointer":
			uiSchema = updateSafelyWithJSONPointer(uiSchema, op.value, op.pointer);
			break;
		case "replace":
		default:
			uiSchema = op.uiSchema;
		}
		return uiSchema;
	}, uiSchema);
};
