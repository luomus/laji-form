import React from "react";
import ObjectField from "react-jsonschema-form/lib/components/fields/ObjectField";
import { orderProperties } from "react-jsonschema-form/lib/utils";
import { renderGrid } from "./GridLayoutField";

export function ObjectFieldTemplate(props) {
	const { TitleField, DescriptionField } = props;
	return (
		<fieldset>
			{props.title &&
					<TitleField
						id={`${props.idSchema.$id}__title`}
						title={props.title}
						required={props.required}
						formContext={props.formContext}
					/>}
			{props.description &&
				<DescriptionField
					id={`${props.idSchema.$id}__description`}
					description={props.description}
					formContext={props.formContext}
				/>}
			{props.properties}
		</fieldset>
	);
}

function GridTemplate(props) {
	const propToSchema = orderProperties(Object.keys(props.schema.properties), props.uiSchema["ui:order"]).reduce((obj, prop, i) => {
		obj[prop] = props.properties[i];
		return obj;
	}, {});
	return renderGrid(props.schema, props.uiSchema, props.uiSchema["ui:grid"], props.name, (property) => {
		return propToSchema[property];
	});
}

export default (props) => {
	const Template = props.uiSchema["ui:grid"] ? GridTemplate : ObjectFieldTemplate;
	return <ObjectField {...props} registry={{...props.registry, ObjectFieldTemplate: Template}} />;
};
