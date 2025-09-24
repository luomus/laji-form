import * as React from "react";
import * as PropTypes from "prop-types";
import update from "immutability-helper";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Injects given fields value as default value to target field.
 * uiSchema = { "ui:options": {
 *  "injections": [
 *    {
 *      "fields": [field1, field2...], (fields to inject from source field)
 *      "target": fieldName (target field where default value is injected)
 *      "source": fieldName (source field where default value is injected from. Must be object field)
 *    }
 *    ...
 *  ]
 * }}
 */
@VirtualSchemaField
export default class InjectDefaultValueField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				fields: PropTypes.arrayOf(PropTypes.string).isRequired,
				target: PropTypes.string.isRequired,
				source: PropTypes.string.isRequired
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object", "array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired
	};

	static getName() {return "InjectDefaultValueField";}

	getStateFromProps() {
		return {onChange: this.onChange};
	}

	onChange = (formData) => {
		let {schema} = this.props;
		const options = this.getUiOptions();
		const {fields, target} = options;

		let source = options.source ? formData[options.source] : formData;
		fields.forEach(field => {
			if (schema.properties[target].type === "array") {
				if (formData && formData[target]) formData[target].forEach((item, i) => {
					if (item[field] === this.props.formData[options.source][field]) {
						formData = update(formData,
							{[target]: {$splice: [[i, 1, update(item, {$merge: {[field]: source[field]}})]]}});
					}
				});
			}
		});

		this.props.onChange(formData);
	};
}

