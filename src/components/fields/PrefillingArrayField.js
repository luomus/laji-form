import { Component } from "react";
import PropTypes from "prop-types";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class PrefillingArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				field: PropTypes.string,
				uiSchema: PropTypes.object
			})
		})
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
			}
		};
	}

	mapFormData = (formData) => {
		const prefiller = formData.prefiller;
		return (formData.rest && formData.rest.length
			? formData.rest
			: [getDefaultFormState(this.props.schema.items, undefined, this.props.registry.definitions)]
		).map(item => {
			return {
				...item,
				[this.getUiOptions().field]: prefiller
			};
		});
	}

	onChange(formData) {
		this.props.onChange(this.mapFormData(formData));
	}
}
