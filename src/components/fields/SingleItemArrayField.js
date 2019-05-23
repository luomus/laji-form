import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getDefaultFormState, isMultiSelect } from "react-jsonschema-form/lib/utils";
import { getUiOptions } from "../../utils";

@VirtualSchemaField
export default class SingleItemArrayField extends Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	static getName() {return "SingleItemArrayField";}

	getStateFromProps(props) {
		return isMultiSelect(props.schema, props.registry.definitions) ? {
			...props,
			formData: props.formData && props.formData.length ? props.formData[0] : getDefaultFormState(props.schema.items, undefined, props.registry.definitions),
			schema: {title:props.schema.title, ...props.schema.items},
			uiSchema: props.uiSchema.items || {},
			onChange: this.onChange
		} : {
			...props,
			formData: props.formData && props.formData.length ? props.formData : [getDefaultFormState(props.schema.items, undefined, props.registry.definitions)],
			uiSchema: {
				...props.uiSchema,
				"ui:field": "SingleActiveArrayField",
				"ui:options": {
					activeIdx: 0,
					...getUiOptions(props.uiSchema),
					renderer: "uncontrolled",
					addable: false
				}
			}
		};
	}

	onChange(formData) {
		this.props.onChange([formData]);
	}
}
