import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Injects given fields value as default value to target field.
 * uiSchema = { "ui:options": {
 *  "injections": [
 *    {
 *      "fields": [field1, field2...], (fields to inject from source field)
 *      "target": fieldName (target field where default value is injected)
 *      "source": fieldName (source field where default value is injected from. Must be object field)
 *    }
 *    ...
 *  ]
 * }}
 */
export default class InjectDefaultValueField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				fields: PropTypes.arrayOf(PropTypes.string).isRequired,
				target: PropTypes.string.isRequired,
				source: PropTypes.string.isRequired
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

	getStateFromProps = (props) => {
		let {uiSchema, formData, schema} = props;
		const options = uiSchema["ui:options"];
		let fields = options.fields;
		const target = options.target;
		uiSchema = update(uiSchema, {$merge: {"ui:field": undefined}});

		let source = formData;
		if (options.source) {
			source = formData[options.source];
		}

		fields.forEach(field => {
			const schemaInjection = {properties: {[field]: {$merge: {default: source[field]}}}};
			if (schema.properties[target].type === "array") {
				schema = update(schema, {properties: {[target]: {items: schemaInjection}}});
			} else if (schema.properties[target].type === "object") {
				schema = update(schema, {properties: {[target]: schemaInjection}});
			} else {
				throw "schema type must be object or array";
			}
		});

		return {uiSchema, formData, schema};
	}

	render() {
		return (
			<SchemaField {...this.props} {...this.state} />
		)
	}
}
