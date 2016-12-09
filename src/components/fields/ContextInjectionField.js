import React, { Component, PropTypes } from "react";
import merge from "deepmerge";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUpdateObjectFromPath, getUiOptions, getInnerUiSchema, parseDotPath } from "../../utils";

export default class ContextInjectionField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				injections: PropTypes.object.isRequired,
				uiSchema: PropTypes.object
			}).isRequired
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
			uiSchema = merge(uiSchema,
				getUpdateObjectFromPath(
					injectionPath,
					parseDotPath(this.props.formContext.uiSchemaContext, injections[injectionPath]))
			);
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
