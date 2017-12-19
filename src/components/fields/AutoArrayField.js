import { Component } from "react";
import PropTypes from "prop-types";
import deepEquals from "deep-equal";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import { getUiOptions, focusById } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class AutoArrayField extends Component {
	static PropTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				autofocus: PropTypes.boolean
			})
		})
	}

	static getName() {return "AutoArrayField";}

	getStateFromProps(props) {
		const {formData, schema, uiSchema, registry} = props;

		const state = {formData};

		const emptyItem = getDefaultFormState(schema.items, undefined, registry.definitions);
		if (formData && (formData.length === 0 || !deepEquals(formData[formData.length - 1], emptyItem))) {
			state.formData = [...formData, emptyItem];
		}
		state.uiSchema = {...uiSchema, "ui:options": {...(uiSchema["ui:options"] || {}), nonOrderables: [state.formData.length - 1], nonRemovables: [state.formData.length - 1]}};
		return state;
	}

	componentDidUpdate(prevProps, prevState) {
		if (getUiOptions(this.props.uiSchema).autofocus && this.state.formData.length == prevState.formData.length + 1) {
			focusById(this.props.formContext, `${this.props.idSchema.$id}_${this.state.formData.length - 1}`);
		}
	}
}
