import * as React from "react";
import * as PropTypes from "prop-types";
import { getDefaultFormState } from  "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class PrefillingArrayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				field: PropTypes.string,
				uiSchema: PropTypes.object
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array.isRequired
	}

	static getName() {return "PrefillingArrayField";}

	getStateFromProps(props) {
		const {field, uiSchema} = this.getUiOptions();
		return {
			...props,
			schema: {
				type: "object",
				title: "",
				properties: {
					prefiller: props.schema.items.properties[field],
					rest: props.schema
				}
			},
			uiSchema: {
				prefiller: uiSchema || props.uiSchema.items[field],
				rest: props.formData && props.formData.length ? props.uiSchema : {
					...props.uiSchema,
					"ui:options": {
						...props.uiSchema["ui:options"],
						canAdd: false
					}
				},
			},
			formData: {
				prefiller: ((props.formData || [])[0] || {})[field],
				rest: props.formData
			},
			idSchema: {
				prefiller: {prefiller: `${props.idSchema.$id}_${field}`},
				rest: props.idSchema
			},
			onChange: this.onChange
		};
	}

	mapFormData = (formData) => {
		const prefiller = formData.prefiller;
		return (formData.rest && formData.rest.length
			? formData.rest
			: [getDefaultFormState(this.props.schema.items)]
		).map(item => {
			return {
				...item,
				[this.getUiOptions().field]: prefiller
			};
		});
	}

	onChange = (formData) => {
		this.props.onChange(this.mapFormData(formData));
	}
}
