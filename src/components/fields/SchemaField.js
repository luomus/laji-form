import * as React from "react";
import Context from "../../Context";
import { isMultiSelect, getUiOptions } from "../../utils";
import { isObject } from "laji-map/lib/utils";
import { getInjectedUiSchema } from "./ContextInjectionField";
import { deepEquals } from  "@rjsf/utils";
import ArrayFieldTemplate from "../ArrayFieldTemplate";
import { getDefaultRegistry } from "@rjsf/core";

export default class _SchemaField extends React.Component {
	constructor(props) {
		super(props);
		this.updateVirtualInstance(props, !!"initial");
		this.state = {showAnnotations: false};
	}

	UNSAFE_componentWillReceiveProps(props) {
		this.updateVirtualInstance(props);
	}

	updateVirtualInstance = (props, initial) => {
		const virtualizedProps = ["ui:functions", "ui:childFunctions", "ui:annotations"];
		if ([props, this.props].some(_props => _props.uiSchema && virtualizedProps.some(prop => _props.uiSchema[prop])) &&
		    (initial || !deepEquals(this.props, props))) {
			this.functionOutputProps = this.applyFunction(props);
		}
	}

	applyFunction(props) {
		let {
			"ui:functions": functions,
			"ui:childFunctions": childFunctions,
			"ui:annotations": annotations,
			..._uiSchema
		} = (props.uiSchema || {});

		const objectOrArrayAsArray = item => (
			item
				? (Array.isArray(item)
					? item
					: [item])
				: []
		);

		functions = objectOrArrayAsArray(functions);

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

		if (!functions.length) return props;

		let _props = {...props, uiSchema: _uiSchema};
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

	componentDidUpdate(prevProps) {
		if (!deepEquals(prevProps.errorSchema, this.props.errorSchema)) {
			new Context(this.props.registry.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "resize");
		}
	}

	render() {
		const props = this.functionOutputProps || this.props;
		let {schema, uiSchema = {}, formContext, registry, ..._props} = props; // eslint-disable-line @typescript-eslint/no-unused-vars
		const {formContext: _formContext} = registry;

		if (schema.uniqueItems && schema.items.enum && !isMultiSelect(schema, uiSchema) && schema.uniqueItems) {
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

		// Reset ArrayFieldTemplate.
		if (registry.ArrayFieldTemplate !== ArrayFieldTemplate) {
			registry = {...registry, ArrayFieldTemplate};
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
			{..._props}
			registry={registry}
			schema={schema}
			uiSchema={uiSchema}
		/>;
	}
}
