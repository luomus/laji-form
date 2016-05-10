import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField"

/**
 * Transforms an array field to o boolean field, where each value is true/false according to another array field.
 * Each value is true, if formData[booleanDefiner] == formData[booleanField].
 * uiSchema = { "ui:options": {
 *  booleanField: <array field name>,
 *  booleanDefiner: <array field name>,
 *  uiSchema: <uiSchema> (uiSchema used for each object).
 * }}
 */
export default class DependentBooleanField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema} = props;
		uiSchema = (uiSchema && uiSchema["ui:options"] && uiSchema["ui:options"].uiSchema) ?
			uiSchema["ui:options"].uiSchema : {};

		let options = props.uiSchema["ui:options"]
		let booleanField = options.booleanField;
		let definer = options.booleanDefiner;

		let schema = update(props.schema, {properties: {[booleanField]: {items: {$merge: {type: "boolean"}}}}});


		let booleanFieldDataDictionarified = this.getDictionarifiedBooleanFieldData(props.formData);

		let booleanFieldData = [];
		if (this.checkFieldSanity(props.formData, definer) && this.checkFieldSanity(props.formData, booleanField)) props.formData[definer].forEach((definerItem) => {
			booleanFieldData.push(!!booleanFieldDataDictionarified[definerItem]);
		});
		let formData = update (props.formData, {[booleanField]: {$set: booleanFieldData}});

		return {schema, uiSchema, formData, onChange: this.onChange, origBooleanFieldData: props.formData[booleanField]};
	}


	onChange = (formData) => {
		let options = this.props.uiSchema["ui:options"];
		let booleanField = options.booleanField;
		let definer = options.booleanDefiner;

		let origData = this.state.origBooleanFieldData;
		let dictionarifiedOrigData = this.getDictionarifiedFormData(this.state, "origBooleanFieldData");

		formData[definer].forEach((definerItem, i) => {
			if (dictionarifiedOrigData[definerItem] && !formData[booleanField][i]) origData.splice(origData.indexOf(definerItem), 1);
			else if (!dictionarifiedOrigData[definerItem] && formData[booleanField][i]) origData.push(definerItem);
		})

		formData[booleanField] = origData;
		this.props.onChange(formData);
	}

	getDictionarifiedFormData = (formData, field) => {
		let formDataDictionarified = {};
		if (!this.checkFieldSanity(formData, field)) return formDataDictionarified;
		formData[field].forEach((value) => {
			formDataDictionarified[value] = true;
		});
		return formDataDictionarified;

	}

	getDictionarifiedBooleanFieldData = (formData) => {
		return this.getDictionarifiedFormData(formData, this.props.uiSchema["ui:options"].booleanField)
	}

	checkFieldSanity = (formData, field) => {
		return formData[field] && Array.isArray(formData[field]);
	}

	render() {
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
