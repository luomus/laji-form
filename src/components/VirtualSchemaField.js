import React from "react";
import { getInnerUiSchema, getUiOptions, getReactComponentName } from "../utils";
import BaseComponent from "./BaseComponent";
import Context from "../Context";

/**
 * Virtual SchemaFields are components which are just state transforming machines.
 */
export default function VirtualSchemaField(ComposedComponent) {
	@BaseComponent
	class VirtualSchemaField extends ComposedComponent {

		static displayName = getReactComponentName(ComposedComponent);

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
				...super.getStateFromProps ? super.getStateFromProps(propsWithInnerUiSchema, props) : propsWithInnerUiSchema,
				onChange: this.onChange
			};
		}

		render() {
			if (super.render) return super.render();

			const SchemaField = this.props.registry.fields.SchemaField;

			const filterProps = props => [
				"schema",
				"uiSchema",
				"idSchema",
				"formData",
				"errorSchema",
				"formContext",
				"registry",
				"onChange"
			].reduce((_props, prop) => {
				if (prop in props) _props[prop] = props[prop];
				return _props;
			}, {});

			return (
				<SchemaField
					{...filterProps({...this.props, ...this.state})}
				/>
			);
		}

	}

	if (ComposedComponent.getName) {
		const name = ComposedComponent.getName();
		new Context("VIRTUAL_SCHEMA_NAMES")[name] = true;
		if (ComposedComponent.getName() !== getReactComponentName(ComposedComponent)) {
			console.warn(`${getReactComponentName(ComposedComponent)} getName() doesn't return it's component name! (It returned '${name}')`);
		}
	} else {
		console.warn(`${getReactComponentName(ComposedComponent)} is missing getName() static method!`);
	}

	return VirtualSchemaField;
}
