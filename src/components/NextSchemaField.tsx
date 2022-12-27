import * as React from "react";
import { getInnerUiSchema } from "../utils";
import { FieldProps } from "./LajiForm";

export default function NextSchemaField(props: FieldProps) {
	const {SchemaField} = props.registry.fields;
	return <SchemaField {...props} uiSchema={getInnerUiSchema(props.uiSchema)} />
}
