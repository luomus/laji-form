import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
/**
 * Inject given values to given fields if there is some value in field injectionDefiner
 */
@VirtualSchemaField
export default class DependentInjectValueField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				injectionDefiner: PropTypes.string.isRequired,
				injections: PropTypes.arrayOf(PropTypes.shape({
					field: PropTypes.string.isRequired,
					value: PropTypes.any.isRequired
				}))
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	};

	onChange(formData) {
		formData = {...formData};
		const {injectionDefiner, injections} = this.getUiOptions();
		if (formData[injectionDefiner] !== undefined && formData[injectionDefiner] !== null) {
			injections.forEach((injection) => {
				formData[injection.field] = injection.value;
			});
		} else {
			injections.forEach((injection) => {
				formData[injection.field] = undefined;
			});
		}
		this.props.onChange(formData);
	}
}
