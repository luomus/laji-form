import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { assignUUID, getUUID, getDefaultFormState, getInnerUiSchema } from "../../utils";

@VirtualSchemaField
export default class AutoArrayField extends React.Component {
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
		const {formData = [], schema, uiSchema, formContext: {utils}} = props;

		const state = {formData};

		const newEmptyItem = getDefaultFormState(schema.items);
		const emptyItem = this.emptyItem
			&& utils.formDataEquals(newEmptyItem, this.emptyItem, props.idSchema.$id)
			&& formData.every(item => getUUID(item) !== getUUID(this.emptyItem))
			? this.emptyItem
			: assignUUID(newEmptyItem);
		this.emptyItem = emptyItem;
		if (formData && (formData.length === 0 || !utils.formDataEquals(formData[formData.length - 1], emptyItem, props.idSchema.$id))) {
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
		const emptyItem = getDefaultFormState(this.props.schema.items);
		if (formData && formData.length !== 0 && this.props.formContext.utils.formDataEquals(formData[formData.length - 1], emptyItem, this.props.idSchema.$id)) {
			formData = formData.slice(0, formData.length - 1);
		}
		this.props.onChange(formData);
	}
}
