import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

export default class InjectDefaultValueField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema, formData} = props;
		const options = uiSchema["ui:options"];
		let fields = options.fields;
		const target = options.target;
		uiSchema = update(uiSchema, {$merge: {"ui:field": undefined}});

		let source = formData;
		if (options.source) {
			source = formData[options.source];
		}

		const copiedTo = {};

		if (!Array.isArray(fields)) fields = [fields];
		fields.forEach(field => {
				if (Array.isArray(formData[target])) {
					formData[target].forEach((item, i) => {
						let targetsValue = formData[target][i][field];
						if (targetsValue === undefined && targetsValue !== "") {
							formData = update(formData, {[target]: {[i]: {$merge: {[field]: source[field]}}}});
							copiedTo[i] = true;
						}
					});
				} else {
					if (formData[target][field] === undefined) {
						formData = update(formData, {[target]: {$merge: {[field]: source[field]}}});
					}
				}
		});

		return {uiSchema, formData};
	}

	render() {
		return (
			<SchemaField {...this.props} {...this.state} />
		)
	}
}
