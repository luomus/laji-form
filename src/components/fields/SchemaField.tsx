import * as React from "react";
import { asArray, getUiOptions } from "../../utils";
import { isObject } from "@luomus/laji-map/lib/utils";
import { getInjectedUiSchema } from "./ContextInjectionField";
import { getDefaultRegistry } from "@rjsf/core";
import { FieldProps, isJSONSchemaArray } from "../../types";

export default class _SchemaField extends React.Component<FieldProps> {

	applyFunction(props: FieldProps) {
		let {
			"ui:functions": functions,
			"ui:childFunctions": childFunctions,
			"ui:annotations": annotations,
			"ui:multiLanguage": multiLanguage,
			..._uiSchema
		} = (props.uiSchema || {});

		functions = functions ? asArray(functions) : [];

		if (childFunctions) {
			functions = [
				{"ui:field": "UiFieldMapperArrayField", "ui:options": {functions: childFunctions}},
				...functions
			];
		}

		if (annotations) {
			functions = [
				{"ui:field": "AnnotationField", "ui:options": (isObject(annotations) ? annotations : {})},
				...functions
			];
		}

		if (multiLanguage) {
			functions = [
				{"ui:field": "MultiLanguageField"},
				...functions
			];
		}

		if (!functions.length) return props;

		let _props: FieldProps = {...props, uiSchema: _uiSchema};
		let [uiFn, ...restUiFns] = functions;

		const {"ui:injections": injections} = uiFn;
		if (injections) {
			const injectedUiSchema = getInjectedUiSchema(uiFn, injections, props.registry.formContext.uiSchemaContext);
			uiFn = {
				...injectedUiSchema,
				"ui:injections": undefined
			};
		}

		const buttons = !_props.uiSchema["ui:field"] ? getUiOptions(_props.uiSchema).buttons : undefined;
		const uiButtons = !_props.uiSchema["ui:field"] ? getUiOptions(_props.uiSchema)["ui:buttons"] : undefined;
		_props = {
			..._props, 
			uiSchema: (_props.uiSchema["ui:field"] || _props.uiSchema["ui:widget"])
				? {...uiFn, uiSchema: _props.uiSchema}
				: {..._props.uiSchema, ...uiFn}
		};
		if (buttons || uiButtons) {
			_props = {
				..._props, 
				uiSchema: {
					..._props.uiSchema,
					"ui:options": {
						..._props.uiSchema["ui:options"],
						buttons: [...(_props.uiSchema.buttons || []), ...(buttons || [])],
						"ui:buttons": [...(_props.uiSchema["ui:buttons"] || []), ...(uiButtons || [])]
					}
				}
			};
		}

		return {
			..._props,
			uiSchema: {
				..._props.uiSchema,
				"ui:functions": restUiFns
			}
		};
	}

	render() {
		const props = this.applyFunction(this.props);
		let {schema, uiSchema = {}, formContext, registry, ..._props} = props; // eslint-disable-line @typescript-eslint/no-unused-vars
		const {formContext: _formContext} = registry;

		// rjsf displays a duplicate label if 'uniqueItems' is true in some cases. We prevent that here.
		// Example of when it shows duplicate is http://localhost:8083/?id=JX.652&local=true, "Elinympäristö" on gathering
		// level.
		if (isJSONSchemaArray(schema) && uiSchema && uiSchema.items && uiSchema.items["ui:field"]) {
			schema = {...schema, uniqueItems: false};
		}

		const options = getUiOptions(uiSchema);
		if (typeof options.label === "string") {
			schema = {...schema, title: options.label};
		}

		const {"ui:injections": injections} = uiSchema;
		if (injections) {
			const injectedUiSchema = getInjectedUiSchema(uiSchema, injections, _formContext.uiSchemaContext);
			uiSchema = {
				...injectedUiSchema,
				"ui:injections": undefined
			};
		}

		// Remove unnecessary formDataTransformers in order to prevent unnecessary rendering.
		if (_formContext && _formContext.formDataTransformers && _formContext.formDataTransformers.length) {
			const removeIdxs = /\d+_?/g;
			const idWithoutIdxs = this.props.idSchema.$id.replace(removeIdxs, "");
			const filtered = _formContext.formDataTransformers.filter(({targets}) => 
				targets.some(target => target.replace(removeIdxs, "").startsWith(idWithoutIdxs))
			);
			if (filtered.length !== _formContext.formDataTransformers.length) {
				registry = {...registry, formContext: {..._formContext, formDataTransformers: filtered}};
			}
		}

		const {SchemaField} = getDefaultRegistry().fields;
		return <SchemaField
			{..._props as any}
			registry={registry}
			schema={schema}
			uiSchema={uiSchema}
		/>;
	}
}
