import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { getDefaultFormState, isMultiSelect } from "@rjsf/core/dist/cjs/utils";
import { getUiOptions, getTitle, getRelativeTmpIdTree, addLajiFormIds } from "../../utils";
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

	getStateFromProps(props) {
		const {activeIdx = 0} = getUiOptions(props.uiSchema);
		let uiSchema = {
			"ui:title": getTitle(props, activeIdx),
			"ui:help": props.uiSchema["ui:help"],
			...props.uiSchema.items || {},
			"ui:options": {
				titleClassName: getUiOptions(props.uiSchema).titleClassName,
				...getUiOptions(props.uiSchema.items),
			}
		};
		if (isMultiSelect(props.schema, props.registry.definitions)) {
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
					getDefaultFormState(props.schema.items, undefined, props.registry.definitions),
					getRelativeTmpIdTree(props.formContext.contextId, props.idSchema.$id),
					false
				)[0],
			//schema: {title: props.schema.title, ...props.schema.items},
			schema: props.schema.items,
			uiSchema,
			idSchema: ArrayFieldPatched.prototype.getIdSchema.call(this, props, activeIdx),
			errorSchema: props.errorSchema[activeIdx] || {},
			onChange: this.onChange
		};
	}

	onChange(formData) {
		const {activeIdx = 0} = this.getUiOptions();
		const copy = (this.props.formData || []).slice();
		copy[activeIdx] = formData;
		this.props.onChange(copy);
	}
}
