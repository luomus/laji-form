import { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import { parseJSONPointer } from "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class ContextInjectionField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				injections: PropTypes.object.isRequired,
				target: PropTypes.oneOf(["uiSchema", "schema"]),
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object", "array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
	}

	static getName() {return  "ContextInjectionField";}

	getStateFromProps(props) {
		const {injections, target = "uiSchema"} = this.getUiOptions();
		const container = props[target];
		return {[target]: getInjectedUiSchema(container, injections, props.formContext.uiSchemaContext)};
	}
}

export function getInjectedUiSchema(uiSchema, injections, uiSchemaContext) {
	let	injected = false;
	const updateObject = {};
	for (let injectionPath in injections) {
		const splitted = injectionPath.substring(1).split("/");
		const last = splitted.pop();
		const tail = splitted.reduce((pointer, path) => {
			if (!pointer[path]) pointer[path] = {};
			return pointer[path];
		}, updateObject);
		let value = injections[injectionPath];
		if (value.match(/%{.*}/)) {
			while (value.match(/%{.*}/)) {
				const [match, innerValue] = value.match(/%{(.*)}/);
				value = value.replace(match, parseJSONPointer(uiSchemaContext, innerValue));
			}
		} else {
			value = parseJSONPointer(uiSchemaContext, value);
		}
		tail[last] = {$set: value};
		injected = true;
	}
	if (injected) uiSchema = update(uiSchema, updateObject);

	return uiSchema;
}
