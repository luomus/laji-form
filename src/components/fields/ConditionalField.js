import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import deepmerge from "deepmerge";

const rulePropType = PropTypes.shape({
	field: PropTypes.string.isRequired,
	regexp: PropTypes.string.isRequired,
});

const operationPropType = PropTypes.shape({
	type: PropTypes.oneOf(["merge", "wrap"]),
	uiSchema: PropTypes.object.isRequired,
});

const casePropType = PropTypes.shape({
	rules: PropTypes.oneOfType([
		rulePropType,
		PropTypes.arrayOf(rulePropType)
	]),
	operations: PropTypes.oneOfType([
		operationPropType,
		PropTypes.arrayOf(operationPropType)
	])
});

/**
 * Transforms uiSchema according to conditional cases. 
 * uischema = {"ui:options": {
 *	cases: [
 *		rules: [
 *			{
 *				regexp: The regexp that the field must match.
 *				field: The field that has to match the regexp
 *			}
 *		],
 *		operations: [ // All the operations are performed if all rules pass.
 *			{
 *				type: "merge" or "wrap" "replace". "merge" deeply merges the conditional uiSchema to the nested uiSchema.
 *				                                   "wrap" sets the nested uiSchema inside conditional uiSchema.
 *				                                   "replace" (default) replaces nested uiSchema with conditional uiSchema.
 *				uiSchema: conditional uiSchema to use.
 *			}
 *		]
 *	]
 * }
 * uiSchema: nested uiSchema
 * }
 */
@VirtualSchemaField
export default class ConditionalField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				cases: PropTypes.oneOfType([
					casePropType,
					PropTypes.arrayOf(casePropType)
				])
			})
		})
	}

	static getName() {return  "ConditionalField";}

	checkRule = (props) => ({field, regexp}) => {
		let value = (props.formData || {})[field];
		if (value === undefined) value = "";
		return `${value}`.match(new RegExp(regexp));
	}

	getStateFromProps(props) {
		const {cases = []} = this.getUiOptions();

		const {uiSchema} = props;

		let computedUiSchema = uiSchema;
		(Array.isArray(cases) ? cases : [cases]).some(({rules = [], operations = []}) => {
			const passes = (Array.isArray(rules) ? rules : [rules]).every(this.checkRule(props));
			if (passes)  {
				computedUiSchema = (Array.isArray(operations) ? operations : [operations]).reduce((_uiSchema, op) => {
					switch (op.type) {
					case "merge":
						computedUiSchema = deepmerge(uiSchema,  op.uiSchema, {arrayMerge: (a1, a2) => a2});
						break;
					case "wrap":
						computedUiSchema = {...op.uiSchema, uiSchema: computedUiSchema};
						break;
					case "replace":
					default:
						computedUiSchema = op.uiSchema;
					}
					return computedUiSchema;
				}, computedUiSchema);
			}
			return passes;
		});

		return {uiSchema: computedUiSchema};
	}
}
