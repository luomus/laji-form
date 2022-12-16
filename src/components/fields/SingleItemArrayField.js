import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getUiOptions, getTitle, addLajiFormIds, getDefaultFormState, isMultiSelect } from "../../utils";
import { ArrayFieldPatched } from "./ArrayField";

@VirtualSchemaField
export default class SingleItemArrayField extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	static getName() {return "SingleItemArrayField";}


	constructor(props) {
		super(props);
		props.formContext.globals[`${this.props.idSchema.$id}.activeIdx`] = this.getActiveIdx(props);
	}

	componentDidUpdate() {
		this.props.formContext.globals[`${this.props.idSchema.$id}.activeIdx`] = this.getActiveIdx(this.props);
	}

	getStateFromProps(props) {
		const activeIdx = this.getActiveIdx(props);
		if (typeof activeIdx !== "number" || isNaN(activeIdx)) {
		 return {
				...props,
				uiSchema: {
					"ui:field": "HiddenField"
				}
			};
		}
		let uiSchema = {
			"ui:title": getTitle(props, activeIdx),
			"ui:help": props.uiSchema["ui:help"],
			...props.uiSchema.items || {},
			"ui:options": {
				titleClassName: getUiOptions(props.uiSchema).titleClassName,
				...getUiOptions(props.uiSchema.items),
			}
		};
		if (isMultiSelect(props.schema, uiSchema)) {
			uiSchema = {
				...uiSchema,
				"ui:options": {
					...getUiOptions(uiSchema),
					renderTitleAsLabel: true
				}
			};
		}
		return {
			...props,
			formData: props.formData && props.formData.length && activeIdx in props.formData
				? props.formData[activeIdx]
				: addLajiFormIds(
					getDefaultFormState(props.schema.items),
					this.props.formContext.services.ids.getRelativeTmpIdTree(props.idSchema.$id),
					false
				)[0],
			schema: props.schema.items,
			uiSchema,
			idSchema: ArrayFieldPatched.prototype.getIdSchema.call(this, props, activeIdx),
			errorSchema: props.errorSchema[activeIdx] || {},
			onChange: this.onChange
		};
	}

	getActiveIdx = (props) => {
		const options = getUiOptions(props.uiSchema);
		return "activeIdx" in options
			? options.activeIdx
			: 0;
	}

	onChange = (formData) => {
		const activeIdx = this.getActiveIdx(this.props);
		const copy = (this.props.formData || []).slice();
		copy[activeIdx] = formData;
		this.props.onChange(copy);
	}
}
