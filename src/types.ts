import { FieldProps as RJSFFieldProps, WidgetProps as RJSFWidgetProps, UiSchema as RJSFUiSchema } from "@rjsf/utils";
import { FormContext } from "./components/LajiForm";

export type JSON = string | number | boolean | JSONObject | JSON[] | null;
export type JSONObject = { [prop: string]: JSON };

export type JSONSchema<T = any> =
	JSONSchemaObject
	| JSONSchemaArray<T>
	| JSONSchemaNumber
	| JSONSchemaInteger
	| JSONSchemaBoolean
	| JSONSchemaString
	| JSONSchemaEnum;

type JSONShemaTypeCommon<T, D> = {
	type: T;
	default?: D;
	title?: string;
}

export type JSONSchemaObject = JSONShemaTypeCommon<"object", Record<string, JSONObject>> & {
	properties: Record<string, JSONSchema>;
	required?: string[];
}

export function isJSONSchemaObject(schema: JSONSchema): schema is JSONSchemaObject {
	return schema.type === "object";
}

export type JSONSchemaArray<T = JSONSchema, D = never> = JSONShemaTypeCommon<"array", D[]> & {
	items: T;
	uniqueItems?: boolean;
	maxItems?: number;
}

export function isJSONSchemaArray(schema: JSONSchema): schema is JSONSchemaArray {
	return schema.type === "array";
}

export type JSONSchemaNumber = JSONShemaTypeCommon<"number", number>;

export type JSONSchemaInteger = JSONShemaTypeCommon<"integer", number>;

export type JSONSchemaBoolean = JSONShemaTypeCommon<"boolean", boolean>;

export type JSONSchemaString = JSONShemaTypeCommon<"string", string>;

export type JSONSchemaEnumOneOf = {const: string, title: string};

export type JSONSchemaEnum = JSONSchemaString & {
	oneOf: JSONSchemaEnumOneOf[];
}

export function isJSONSchemaEnum(jsonSchema: JSONSchema): jsonSchema is JSONSchemaEnum{
	return !!(jsonSchema as any).oneOf;
}

export type Lang = "fi" | "en" | "sv";

export type WithNonNullableKeys<T, K extends keyof T> = Omit<T, K> & {
	[P in K]-?: NonNullable<T[P]>;
};

export type FieldProps<T = any, S extends JSONSchemaObject | JSONSchemaArray = JSONSchemaObject> =
	WithNonNullableKeys<RJSFFieldProps<T, S, FormContext>, "errorSchema" | "formContext"> & {
		registry: RJSFFieldProps<any, JSONSchema, FormContext>["registry"]; // Prevent `S` from being passed to registry. `S` should be the "this" components schema.
	}

export type WidgetProps<T = any, S extends JSONSchema = JSONSchema> =
	WithNonNullableKeys<RJSFWidgetProps<T, S, FormContext>, "errorSchema" | "formContext"> & {
		registry: RJSFFieldProps<any, JSONSchema, FormContext>["registry"]; // Prevent `S` from being passed to registry. `S` should be the "this" components schema.
	}

export type UiSchema<S extends JSONSchema = JSONSchemaObject> = RJSFUiSchema<any, S, FormContext>;

export interface HasMaybeChildren {
	children?: React.ReactNode;
}

export interface HasMaybeClassName {
	className?: string;
}
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<{ [K: string]: T[K] }>;
