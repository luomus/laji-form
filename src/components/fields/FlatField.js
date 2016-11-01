import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { toIdSchema, shouldRender } from  "react-jsonschema-form/lib/utils"
import { immutableDelete } from "../../utils";

export default class FlatField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				"fields": PropTypes.arrayOf(PropTypes.string),
				uiSchema: PropTypes.object
			})
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
		const state = {
			schema: props.schema,
			uiSchema: props.uiSchema,
			errorSchema: props.errorSchema,
			formData: props.formData
		};

		const options = props.uiSchema["ui:options"];

		options.fields.forEach(field => {
			const innerSchema = props.schema.properties[field];
			const propertiesName = innerSchema.properties ? "properties" : "items";
			let properties = innerSchema[propertiesName];
			if (properties.properties) properties = properties.properties;

			if (properties) Object.keys(properties).forEach(innerField => {
				state.schema = update(state.schema, {properties: {$merge: {[`_${field}.${innerField}`]: properties[innerField]}}});
			});
			state.schema.properties = immutableDelete(state.schema.properties, field);

			["formData", "errorSchema"].forEach(propsField => {
				if (props[propsField] && props[propsField][field]) {
					let innerData = props[propsField][field];
					if (Array.isArray(innerData)) {
						innerData = innerData[0];
					}

					Object.keys(innerData).forEach(innerField => {
						state[propsField] = update(state[propsField], {$merge: {[`_${field}.${innerField}`]: innerData[innerField]}});
					});
					state[propsField] = immutableDelete(state[propsField], field);
				}
			});
		});

		if (options.uiSchema) state.uiSchema = options.uiSchema;

		state.idSchema = toIdSchema(state.schema, props.idSchema.$id, props.registry.definitions);

		return state;
	}

	onChange = (formData) => {
		const options = this.props.uiSchema["ui:options"];
		Object.keys(formData).forEach(item => {
			if (item[0] === "_") options.fields.forEach(field => {
				if (item.includes(`_${field}.`)) {
					const newItemName = item.replace(`_${field}.`, "");
					formData = update(formData, {$merge: {[field]: update((formData[field] || {}), {$merge: {[newItemName]: formData[item]}})}});
				}
			});
		});
		this.props.onChange(formData);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}

}
