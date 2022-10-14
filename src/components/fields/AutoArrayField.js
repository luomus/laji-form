import * as React from "react";
import * as PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { assignUUID, getUUID, getDefaultFormState, getInnerUiSchema } from "../../utils";
import ReactContext from "../../ReactContext";

@BaseComponent
export default class AutoArrayField extends React.Component {
	static contextType = ReactContext;
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

	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.setState(this.getStateFromProps(this.props));
	}

	static getName() {return "AutoArrayField";}

	getStateFromProps(props) {
		const {formData = [], schema, uiSchema} = props;

		const state = {formData};

		const newEmptyItem = getDefaultFormState(schema.items);
		const emptyItem = this.emptyItem
			&& this.context.utils.formDataEquals(newEmptyItem, this.emptyItem, props.idSchema.$id)
			&& formData.every(item => getUUID(item) !== getUUID(this.emptyItem))
			? this.emptyItem
			: assignUUID(newEmptyItem);
		this.emptyItem = emptyItem;
		if (formData && (formData.length === 0 || !this.context.utils.formDataEquals(formData[formData.length - 1], emptyItem, props.idSchema.$id))) {
			state.formData = [...formData, emptyItem];
		}
		const innerUiSchema = getInnerUiSchema(uiSchema);
		state.uiSchema = {
			...innerUiSchema,
			"ui:options": {
				canAdd: false,
				...(innerUiSchema["ui:options"] || {}),
				nonOrderables: [state.formData.length - 1],
				nonRemovables: [state.formData.length - 1]
			}
		};

		return state;
	}

	onChange(formData) {
		const emptyItem = getDefaultFormState(this.props.schema.items);
		if (formData && formData.length !== 0 && this.contextformDataEquals(formData[formData.length - 1], emptyItem, this.props.idSchema.$id)) {
			formData = formData.slice(0, formData.length - 1);
		}
		this.props.onChange(formData);
	}

	render() {
		if (!this.state.uiSchema) {
			return null;
		}
		const {SchemaField} = this.props.registry.fields;
		return <SchemaField {...this.props} {...this.state} />;
	}

}
