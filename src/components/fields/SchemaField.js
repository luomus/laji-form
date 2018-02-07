import React, { Component } from "react";
import Context from "../../Context";
import { focusById, isMultiSelect, getUiOptions, getInjectedUiSchema } from "../../utils";
import { deepEquals } from  "react-jsonschema-form/lib/utils";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import ArrayFieldTemplate from "../ArrayFieldTemplate";

export default class _SchemaField extends Component {
	constructor(props) {
		super(props);
		this.updateVirtualInstance(props, !!"initial");
	}

	componentDidMount() {
		const {formContext} = this.props.registry;
		const contextId = formContext.contextId;
		const _context = new Context(contextId);
		const {idToFocus} = _context;
		if (idToFocus !== undefined && this.props.idSchema.$id === idToFocus) {
			focusById(formContext, _context.idToFocus);
			_context.idToFocus = undefined;
		}
	}

	componentWillReceiveProps(props) {
		this.updateVirtualInstance(props);
	}

	updateVirtualInstance = (props, initial) => {
		if ([props, this.props].some(_props => _props.uiSchema && (_props.uiSchema["ui:functions"] || _props.uiSchema["ui:childFunctions"])) &&
		    (initial || !deepEquals([this.props, props]))) {
			this.functionOutputProps = this.applyFunction(props);
		}
	}

	applyFunction = (props) => {
		let {"ui:functions": functions, "ui:childFunctions": childFunctions, ..._uiSchema} = (props.uiSchema || {});

		const objectOrArrayAsArray = item => (
			item ? 
				(Array.isArray(item) ?
					item : 
					[item]) :
				[]
		);

		if (childFunctions) {
			functions = [
				{"ui:field": "UiFieldMapperArrayField", "ui:options": {functions: objectOrArrayAsArray(childFunctions)}},
				...objectOrArrayAsArray(functions)
			];
		}

		if (!functions) return props;

		let nonVirtualFound = false;

		const _functions = ((Array.isArray(functions)) ? functions : [functions]);

		const computedProps = _functions.reduce((_props, uiFn, idx) => {
			if (nonVirtualFound) {
				return _props;
			}
			_props = {..._props, uiSchema: {...uiFn, uiSchema: _props.uiSchema}};

			if (!new Context("VIRTUAL_SCHEMA_NAMES")[uiFn["ui:field"]]) {
				nonVirtualFound = true;
				return {
					..._props,
					uiSchema: {
						..._props.uiSchema,
						"ui:functions": _functions.slice(idx + 1)
					}
				};
			}

			const {state = {}} = new props.registry.fields[uiFn["ui:field"]](_props);
			return {
				..._props, 
				...state, 
				registry: {
					..._props.registry, 
					...state.registry,
					formContext: state.formContext || props.registry.formContext
				}
			};
		}, {...props, uiSchema: _uiSchema, formContext: props.registry.formContext});

		return computedProps;
	}

	render() {
		const props = this.functionOutputProps || this.props;
		let {schema, uiSchema = {}, registry} = props;

		if (schema.uniqueItems && schema.items.enum && !isMultiSelect(schema, uiSchema) && schema.uniqueItems) {
			schema = {...schema, uniqueItems: false};
		}

		const options = getUiOptions(uiSchema);
		if (typeof options.label === "string")  {
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
			const injectedUiSchema = getInjectedUiSchema(uiSchema, injections, props.formContext.uiSchemaContext);
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


