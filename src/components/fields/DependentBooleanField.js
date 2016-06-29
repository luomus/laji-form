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
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				booleanField: PropTypes.string.isRequired,
				booleanDefiner: PropTypes.string.isRequired,
				uiSchema: PropTypes.object
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

		return {schema, uiSchema, formData};
	}


	onChange = (formData) => {
		let options = this.props.uiSchema["ui:options"];
		let booleanField = options.booleanField;
		let definer = options.booleanDefiner;

		let origData = this.props.formData[booleanField];
		// if the change happened in booleanField data, reflect the changes to all booleanField items with same data.
		if (JSON.stringify(this.props.formData[definer]) === JSON.stringify(formData[definer])) {
			let dictionarifiedOrigData = this.getDictionarifiedFormData(this.props.formData, booleanField);
			formData[definer].forEach((definerItem, i) => {
				if (dictionarifiedOrigData[definerItem] && !formData[booleanField][i]) origData.splice(origData.indexOf(definerItem), 1);
				else if (!dictionarifiedOrigData[definerItem] && formData[booleanField][i]) origData ? origData.push(definerItem) : (origData = [definerItem]);
			})
		}

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
