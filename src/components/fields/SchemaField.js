import * as React from "react";
import Context from "../../Context";
import { isMultiSelect, getUiOptions } from "../../utils";
import { isObject } from "laji-map/lib/utils";
import { getInjectedUiSchema } from "./ContextInjectionField";
import { deepEquals } from  "@rjsf/core/dist/cjs/utils";
import SchemaField from "@rjsf/core/dist/cjs/components/fields/SchemaField";
import ArrayFieldTemplate from "../ArrayFieldTemplate";

export default class _SchemaField extends React.Component {
	constructor(props) {
		super(props);
		this.updateVirtualInstance(props, !!"initial");
		this.state = {showAnnotations: false};
	}

	componentWillReceiveProps(props) {
		this.updateVirtualInstance(props);
	}

	updateVirtualInstance = (props, initial) => {
		const virtualizedProps = ["ui:functions", "ui:childFunctions", "ui:annotations"];
		if ([props, this.props].some(_props => _props.uiSchema && virtualizedProps.some(prop => _props.uiSchema[prop])) &&
		    (initial || !deepEquals([this.props, props]))) {
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

		//let nonVirtualFound = false;
		let _props = {...props, uiSchema: _uiSchema, formContext: props.registry.formContext};
		//let uiFn = functions[0];
		let [uiFn, ...restUiFns] = functions;

		//const computedProps = functions.reduce((_props, uiFn, idx) => {
		//if (nonVirtualFound) {
		//	return _props;
		//}

		if (
			uiFn["ui:field"] !== "ContextInjectionField" &&
			uiFn["ui:field"] !== "InjectField" &&
			getUiOptions(uiFn).injections
		) {
			const {injections} = uiFn["ui:options"];
			const injectedUiSchema = getInjectedUiSchema(uiFn, injections, props.registry.formContext.uiSchemaContext);
			uiFn = {
				...injectedUiSchema,
				"ui:options": {...injectedUiSchema["ui:options"], injections: undefined}
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
		//if (!new Context("VIRTUAL_SCHEMA_NAMES")[uiFn["ui:field"]]) {
		//nonVirtualFound = true;
		return {
			..._props,
			uiSchema: {
				..._props.uiSchema,
				"ui:functions": restUiFns
			}
		};
		//}

		//const {state = {}} = new props.registry.fields[uiFn["ui:field"]](_props);
		//return {
		//	..._props, 
		//	...state, 
		//	registry: {
		//		..._props.registry, 
		//		...state.registry,
		//		formContext: state.formContext || props.registry.formContext
		//	}
		//};
		//}, {...props, uiSchema: _uiSchema, formContext: props.registry.formContext});

//return computedProps;
	}

	componentDidUpdate(prevProps) {
		if (!deepEquals(prevProps.errorSchema, this.props.errorSchema)) {
			new Context(this.props.registry.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "resize");
		}
	}

	render() {
		const props = this.functionOutputProps || this.props;
		let {schema, uiSchema = {}, registry} = props;

		if (schema.uniqueItems && schema.items.enum && !isMultiSelect(schema, uiSchema) && schema.uniqueItems) {
			schema = {...schema, uniqueItems: false};
		}

		const options = getUiOptions(uiSchema);
		if (typeof options.label === "string") {
			schema = {...schema, title: options.label};
		}

		if (
			uiSchema["ui:field"] &&
			uiSchema["ui:field"] !== "ContextInjectionField" &&
			uiSchema["ui:field"] !== "InjectField" &&
			uiSchema["ui:options"] &&
			uiSchema["ui:options"].injections
		) {
			const {injections} = uiSchema["ui:options"];
			const injectedUiSchema = getInjectedUiSchema(uiSchema, injections, props.registry.formContext.uiSchemaContext);
			uiSchema = {
				...injectedUiSchema,
				"ui:options": {...injectedUiSchema["ui:options"], injections: undefined}
			};
		}

		// Reset ArrayFieldTemplate
		if (registry.ArrayFieldTemplate !== ArrayFieldTemplate) {
			registry = {...registry, ArrayFieldTemplate};
		}

		return <SchemaField
			{...props}
			registry={registry}
			schema={schema}
			uiSchema={uiSchema}
		/>;
	}
}
