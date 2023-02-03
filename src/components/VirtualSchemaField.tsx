import * as React from "react";
import { getInnerUiSchema, getUiOptions, getReactComponentName } from "../utils";
import BaseComponent from "./BaseComponent";
import getContext from "../Context";
import { FieldProps } from "./LajiForm";

export function getPropsWithInnerUiSchema(props: FieldProps): FieldProps {
	return {
		...props,
		uiSchema: getInnerUiSchema(props.uiSchema)
	};
}


type Constructor<LFC> = new(...args: any[]) => LFC;

interface LajiFormComponentForVirtualSchemaField extends Omit<React.Component<FieldProps>, "render"> {
	getStateFromProps?(propsWithInnerUiSchema: FieldProps, origProps: FieldProps): any;
	render?(): React.ReactNode;
}

/**
 * Virtual SchemaFields are components which are just state transforming machines.
 */
 
export default function VirtualSchemaField<LFC extends Constructor<LajiFormComponentForVirtualSchemaField>>(ComposedComponent: LFC) {
	@BaseComponent
	class VirtualSchemaField extends ComposedComponent {
		constructor(...args: any[]) {
			super(...args);
			this.getStateFromProps = this.getStateFromProps.bind(this);
			this.render = this.render.bind(this);
		}

		static displayName = getReactComponentName(ComposedComponent as any);

		getUiOptions() {
			return getUiOptions(this.props.uiSchema);
		}

		getStateFromProps = (props: FieldProps) => {
			const propsWithInnerUiSchema = getPropsWithInnerUiSchema(props);
			const state = super.getStateFromProps ? super.getStateFromProps(propsWithInnerUiSchema, props) : propsWithInnerUiSchema;
			return {
				...propsWithInnerUiSchema,
				...state,
			};
		}

		render = () => {
			if (super.render) return super.render();

			const SchemaField = this.props.registry.fields.SchemaField;

			const filterProps = (props: FieldProps) => [
				"schema",
				"uiSchema",
				"idSchema",
				"formData",
				"errorSchema",
				"registry",
				"onChange",
				"disabled",
				"readonly"
			].reduce<FieldProps>((_props, prop) => {
				if (prop in props) _props[prop] = props[prop];
				return _props;
			}, {} as FieldProps);

			return (
				<SchemaField
					{...filterProps({...this.props, ...this.state})}
				/>
			);
		}
	}

	if ((ComposedComponent as any).getName) {
		const name = (ComposedComponent as any).getName();
		(getContext("VIRTUAL_SCHEMA_NAMES") as any)[name] = true;
		if (process.env.NODE_ENV !== "production" && (ComposedComponent as any).getName() !== getReactComponentName(ComposedComponent as any)) {
			console.warn(`${getReactComponentName(ComposedComponent as any)} getName() doesn't return it's component name! (It returned '${name}')`);
		}
	} else {
		console.warn(`${getReactComponentName(ComposedComponent as any)} is missing static getName() method!`);
	}

	return VirtualSchemaField;
}
