import { Component } from "react";
import PropTypes from "prop-types";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import VirtualSchemaField from "../VirtualSchemaField";
import { formDataEquals, assignUUID, getUUID } from "../../utils";

@VirtualSchemaField
export default class AutoArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				autofocus: PropTypes.boolean
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	static getName() {return "AutoArrayField";}

	getStateFromProps(props) {
		const {formData = [], schema, uiSchema, registry} = props;

		const state = {formData};

		const newEmptyItem = getDefaultFormState(schema.items, undefined, registry.definitions);
		const emptyItem = this.emptyItem
			&& formDataEquals(newEmptyItem, this.emptyItem, props.formContext, props.idSchema.$id)
			&& formData.every(item => getUUID(item) !== getUUID(this.emptyItem))
			? this.emptyItem
			: assignUUID(newEmptyItem);
		this.emptyItem = emptyItem;
		if (formData && (formData.length === 0 || !formDataEquals(formData[formData.length - 1], emptyItem, props.formContext, props.idSchema.$id))) {
			state.formData = [...formData, emptyItem];
		}
		state.uiSchema = {
			...uiSchema,
			"ui:options": {
				canAdd: false,
				...(uiSchema["ui:options"] || {}),
				nonOrderables: [state.formData.length - 1],
				nonRemovables: [state.formData.length - 1]
			}
		};

		return state;
	}

	onChange(formData) {
		const emptyItem = getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions);
		if (formData && formData.length !== 0 && formDataEquals(formData[formData.length - 1], emptyItem, this.props.formContext, this.props.idSchema.$id)) {
			formData = formData.slice(0, formData.length - 1);
		}
		this.props.onChange(formData);
	}
}
