import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions } from "../../utils";

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
		this.state = {onChange: this.onChange, ...this.getStateFromProps(props)};
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema} = props;
		uiSchema = {...uiSchema, "ui:field": undefined};

		return {uiSchema};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onChange = (formData) => {
		let {uiSchema, schema} = this.props;
		const options = getUiOptions(uiSchema);
		const {fields, target} = options;

		let source = options.source ? formData[options.source] : formData;
		fields.forEach(field => {
			if (schema.properties[target].type === "array") {
				if (formData && formData[target]) formData[target].forEach((item, i) => {
					if (item[field] === this.props.formData[options.source][field]) {
						formData = update(formData,
							{[target]: {$splice: [[i, 1, update(item, {$merge: {[field]: source[field]}})]]}});
					}
				});
			}
		});

		this.props.onChange(formData);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (
			<SchemaField {...this.props} {...this.state} />
		)
	}
}

