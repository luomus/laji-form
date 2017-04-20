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
		}).isRequired
	}

	getStateFromProps(props) {
		let {uiSchema} = props;
		const {injections} = this.getUiOptions();

		for (let injectionPath in injections) {
			const updateObject = {};
			const splitted = injectionPath.substring(1).split("/");
			const last = splitted.pop();
			const tail = splitted.reduce((pointer, path) => {
				pointer[path] = {};
				return pointer[path];
			}, updateObject);
			tail[last] = {$set: parseJSONPointer(props.formContext.uiSchemaContext, injections[injectionPath])};
			uiSchema = update(uiSchema, updateObject);
		}

		return {uiSchema};
	}
}
