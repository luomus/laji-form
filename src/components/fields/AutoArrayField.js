import { Component } from "react";
import PropTypes from "prop-types";
import deepEquals from "deep-equal";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import VirtualSchemaField from "../VirtualSchemaField";

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
		formData: PropTypes.array.isRequired
	}

	static getName() {return "AutoArrayField";}

	getStateFromProps(props) {
		const {formData, schema, uiSchema, registry} = props;

		const state = {formData};

		const emptyItem = getDefaultFormState(schema.items, undefined, registry.definitions);
		if (formData && (formData.length === 0 || !deepEquals(formData[formData.length - 1], emptyItem))) {
			state.formData = [...formData, emptyItem];
		}
		state.uiSchema = {
			...uiSchema, 
			"ui:options": {
				canAdd: false,
				...(uiSchema["ui:options"] || {}), 
				nonOrderables: [state.formData.length - 1], nonRemovables: [state.formData.length - 1]
			}
		};

		return state;
	}

	onChange(formData) {
		const emptyItem = getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions);
		if (formData && formData.length !== 0 && deepEquals(formData[formData.length - 1], emptyItem)) {
			formData = formData.slice(0, formData.length - 1);
		}
		this.props.onChange(formData);
	}
}
