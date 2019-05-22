import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
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
		return {
			...props,
			formData: props.formData && props.formData.length ? props.formData : [getDefaultFormState(props.schema.items, undefined, props.registry.definitions)],
			uiSchema: {
				...props.uiSchema,
				"ui:field": "SingleActiveArrayField",
				"ui:options": {
					activeIdx: 0,
					renderTitleAsLabel: true,
					...getUiOptions(props.uiSchema),
					renderer: "uncontrolled",
					addable: false
				},
			}
		};
	}
}
