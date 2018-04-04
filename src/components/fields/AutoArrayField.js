import { Component } from "react";
import PropTypes from "prop-types";
import deepEquals from "deep-equal";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import { getSchemaElementById, getKeyHandlerTargetId } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";
import Context from "../../Context";

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
		const {formData, schema, uiSchema, registry, formContext} = props;

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

		if (this.state && state.formData.length > this.state.formData.length) {
			const {contextId} = formContext;
			const context = new Context(contextId);
			context.idToFocus = `${this.props.idSchema.$id}_${state.formData.length - 1}`;

			let {idToScrollAfterAdd} = this.getUiOptions();
			if (idToScrollAfterAdd) {
				idToScrollAfterAdd = getKeyHandlerTargetId(idToScrollAfterAdd, formContext, this.state.formData);
			}
			context.idToScroll = `_laji-form_${this.props.formContext.contextId}_${this.props.idSchema.$id}_${state.formData.length - 2}`;
		}

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
