import React from "react";
import { getInnerUiSchema, getUiOptions, getReactComponentName } from "../utils";
import FormField from "./BaseComponent";

/**
 * Virtual SchemaFields are components which are just state transforming machines.
 */
export default function VirtualSchemaField(ComposedComponent) {
	@FormField
	class VirtualSchemaField extends ComposedComponent {

		static displayName = `${getReactComponentName(ComposedComponent)} (VirtualSchemaField)`;

		getUiOptions() {
			return getUiOptions(this.props.uiSchema);
		}

		getStateFromProps(props) {
			const propsWithInnerUiSchema = {
				...props,
				uiSchema: getInnerUiSchema(props.uiSchema),
				options: getUiOptions(props.uiSchema)
			};
			return {
				...propsWithInnerUiSchema,
				...super.getStateFromProps ? super.getStateFromProps(propsWithInnerUiSchema) : propsWithInnerUiSchema,
			};
		}

		render() {
			if (super.render) return super.render();

			const SchemaField = this.props.registry.fields.SchemaField;
			return (
				<SchemaField
					{...this.props}
					{...this.state}
					onChange={this.onChange}
				/>
			);
		}

	}
	return VirtualSchemaField;
}
