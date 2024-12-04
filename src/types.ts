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

export type FieldProps<S extends JSONSchema = JSONSchema> = RJSFFieldProps<any, S, FormContext> & {
	uiSchema: UiSchema;
	errorSchema: NonNullable<RJSFFieldProps<any, S, FormContext>["errorSchema"]>; // It's always defined
	formContext: FormContext; // It's always defined
	registry: RJSFFieldProps<any, JSONSchema, FormContext>["registry"]; // Prevent `S` from being passed to registry. `S` should be the "this" components schema.
};
export type WidgetProps<S extends JSONSchema = JSONSchema> = RJSFWidgetProps<any, S, FormContext> & {
	uiSchema: UiSchema;
	errorSchema: NonNullable<RJSFFieldProps<any, JSONSchema, FormContext>["errorSchema"]>; // It's always defined
	formContext: FormContext; // It's always defined
	registry: RJSFWidgetProps<any, JSONSchema, FormContext>["registry"]; // Prevent `S` from being passed to registry. `S` should be the "this" components schema.
};

export type UiSchema = RJSFUiSchema<any, JSONSchemaObject, FormContext>;

export interface HasMaybeChildren {
	children?: React.ReactNode;
}

export interface HasMaybeClassName {
	className?: string;
}
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<{ [K: string]: T[K] }>;
