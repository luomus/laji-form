import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import merge from "deepmerge";

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
		let uiSchema = (props.uiSchema && props.uiSchema["ui:options"] && props.uiSchema["ui:options"].uiSchema) ?
			props.uiSchema["ui:options"].uiSchema : {};

		const injections = props.uiSchema["ui:options"].injections;

		for (let injectionPath in injections) {
			let update = {};
			let updatePointer = update;
			let lastPathName = "";
			let splittedPath = injectionPath.split('.');
			splittedPath.forEach((pathStep, i) => {
				updatePointer[pathStep] = {};
				if (i < splittedPath.length - 1) updatePointer = updatePointer[pathStep];
				lastPathName = pathStep;
			});
			updatePointer[lastPathName] = this.props.registry.uiSchemaContext[injections[injectionPath]];
			uiSchema = merge(uiSchema, update);
		}
		return {uiSchema};
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
