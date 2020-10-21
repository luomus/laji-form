import * as React from "react";
import * as PropTypes from "prop-types";
import update from "immutability-helper";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Sets given default values to target fields.
 * uiSchema = { "ui:options": {
 *  "default": [
 *    {
 *      field1: defaultValue1,
 *      field2: defaultValue2
 *    }
 *    ...
 *  ]
 * }}
 */
@VirtualSchemaField
export default class DefaultValueArrayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				default: PropTypes.object.isRequired
			}).isRequired
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array]).isRequired
	}

	static getName() {return "DefaultValueArrayField";}

	onChange(formData) {
		const options = this.getUiOptions();
		const _default = options.default;

		Object.keys(_default).forEach(field => {
			if (formData) formData.forEach((item, i) => {
				formData = update(formData,
          {$splice: [[i, 1, update(item, {$merge: {[field]: _default[field]}})]]});
			});
		});
		this.props.onChange(formData);
	}
}
