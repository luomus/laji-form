import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, getInnerUiSchema, parseDotPath } from "../../utils";

export default class ContextInjectionField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				injections: PropTypes.object.isRequired,
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		const options = getUiOptions(props.uiSchema);
		let uiSchema = getInnerUiSchema(props.uiSchema);

		const {injections} = options;

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

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<SchemaField
				{...this.props}
				{...this.state}
			/>
		)
	}
}
