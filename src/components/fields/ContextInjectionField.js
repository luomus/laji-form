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
		}).isRequired
	}

	static getName() {return  "ContextInjectionField";}

	getStateFromProps(props) {
		let {uiSchema} = props;
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
		tail[last] = {$set: parseJSONPointer(uiSchemaContext, injections[injectionPath])};
		injected = true;
	}
	if (injected) uiSchema = update(uiSchema, updateObject);

	return uiSchema;
}
