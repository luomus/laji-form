import * as React from "react";
import * as PropTypes from "prop-types";
import update from "immutability-helper";
import { getUiOptions, parseJSONPointer } from "../../utils";
import NextSchemaField from "../NextSchemaField";
import { FieldProps, FormContext } from "../LajiForm";

export default function ContextInjectionField(props: FieldProps) {
	const {injections, target = "uiSchema"} = getUiOptions(props.uiSchema);
	const container = props[target];
	console.log(target, container, injections);
	const nextProps = {[target]: getInjectedUiSchema(container, injections, props.formContext.uiSchemaContext)};

	return <NextSchemaField {...props} {...nextProps} />;
}

ContextInjectionField.propTypes = {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			injections: PropTypes.object.isRequired,
			target: PropTypes.oneOf(["uiSchema", "schema"]),
		}).isRequired,
		uiSchema: PropTypes.object
	}).isRequired,
	formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.string, PropTypes.number, PropTypes.bool]),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["array", "object", "string", "integer", "number", "boolean"])
	}).isRequired,
};

// export default class ContextInjectionField extends React.Component {
// 	static propTypes = {
// 		uiSchema: PropTypes.shape({
// 			"ui:options": PropTypes.shape({
// 				injections: PropTypes.object.isRequired,
// 				target: PropTypes.oneOf(["uiSchema", "schema"]),
// 			}).isRequired,
// 			uiSchema: PropTypes.object
// 		}).isRequired,
// 		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.string, PropTypes.number, PropTypes.bool]),
// 		schema: PropTypes.shape({
// 			type: PropTypes.oneOf(["array", "object", "string", "integer", "number", "boolean"])
// 		}).isRequired,
// 	}
//
// 	static getName() {return  "ContextInjectionField";}
//
// 	getStateFromProps(props) {
// 		const {injections, target = "uiSchema"} = this.getUiOptions();
// 		const container = props[target];
// 		return {[target]: getInjectedUiSchema(container, injections, props.formContext.uiSchemaContext)};
// 	}
// }

export function getInjectedUiSchema<T>(uiSchema: T, injections: Record<string, any>, uiSchemaContext: FormContext["uiSchemaContext"]): T {
	let	injected = false;
	const updateObject = {};
	for (let injectionPath in injections) {
		const splitted = injectionPath.substring(1).split("/");
		const last = splitted.pop() as string;
		const tail = splitted.reduce((pointer, path) => {
			if (!pointer[path]) pointer[path] = {};
			return pointer[path];
		}, updateObject as any);
		let value = injections[injectionPath];
		if (value.match(/%{.*}/)) {
			while (value.match(/%{.*}/)) {
				const [match, innerValue] = value.match(/%{(.*)}/);
				value = value.replace(match, parseJSONPointer(uiSchemaContext, innerValue));
			}
		} else {
			value = parseJSONPointer(uiSchemaContext, value);
		}
		(tail)[last] = {$set: value};
		injected = true;
	}
	if (injected) uiSchema = update(uiSchema, updateObject);

	return uiSchema;
}
