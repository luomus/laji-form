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
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object", "array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired
	}

	static getName() {return  "ContextInjectionField";}

	getStateFromProps(props) {
		let {uiSchema} = props;
		const {injections} = this.getUiOptions();
		return {uiSchema: getInjectedUiSchema(uiSchema, injections, props.formContext.uiSchemaContext)};
	}
}

export function getInjectedUiSchema(uiSchema, injections, uiSchemaContext) {
	let	injected = false;
	const updateObject = {};
	for (let injectionPath in injections) {
		const splitted = injectionPath.substring(1).split("/");
		const last = splitted.pop();
		const tail = splitted.reduce((pointer, path) => {
			pointer[path] = {};
			return pointer[path];
		}, updateObject);
		tail[last] = {$set: parseJSONPointer(uiSchemaContext, injections[injectionPath])};
		injected = true;
	}
	if (injected) uiSchema = update(uiSchema, updateObject);

	return uiSchema;
}
