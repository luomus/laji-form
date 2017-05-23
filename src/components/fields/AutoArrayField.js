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

	getStateFromProps(props) {
		const {formData, schema, registry} = props;

		const state = {formData};

		const emptyItem = getDefaultFormState(schema.items, undefined, registry.definitions);
		if (formData && (formData.length === 0 || !deepEquals(formData[formData.length - 1], emptyItem))) {
			state.formData = [...formData, emptyItem];
		}
		return state;
	}

	componentDidUpdate(prevProps, prevState) {
		if (getUiOptions(this.props.uiSchema).autofocus && this.state.formData.length == prevState.formData.length + 1) {
			focusById(`${this.props.idSchema.$id}_${this.state.formData.length - 1}`);
		}
	}
}
