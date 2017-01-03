import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { parseDotPath } from "../../utils";
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
			const splitted = injectionPath.split(".");
			const last = splitted.pop();
			const tail = splitted.reduce((pointer, path) => {
				pointer[path] = {};
				return pointer[path]
			}, updateObject);
			tail[last] = {$set: parseDotPath(this.props.formContext.uiSchemaContext, injections[injectionPath])};
			uiSchema = update(uiSchema, updateObject);
		}

		return {uiSchema};
	}
}
