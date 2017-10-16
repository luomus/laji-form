import { Component } from "react";
import PropTypes from "prop-types";
import update from "immutability-helper";
import VirtualSchemaField from "../VirtualSchemaField";
/**
 * Transforms an array field to o boolean field, where each value is true/false according to another array field.
 * Each value is true, if formData[booleanDefiner] == formData[booleanField].
 * uiSchema = { "ui:options": {
 *  booleanField: <array field name>,
 *  booleanDefiner: <array field name>,
 *  uiSchema: <uiSchema> (uiSchema used for each object).
 * }}
 */
@VirtualSchemaField
export default class DependentBooleanField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				booleanField: PropTypes.string.isRequired,
				booleanDefiner: PropTypes.string.isRequired,
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	static getName() {return "DependentBooleanField";}

	getStateFromProps(props) {
		let {uiSchema, formData} = props;
		const {booleanField, booleanDefiner} = this.getUiOptions();

		let schema = update(props.schema, {properties: {[booleanField]: {items: {$merge: {type: "boolean"}}}}});

		let booleanFieldDataDictionarified = this.getDictionarifiedBooleanFieldData(formData);

		let booleanFieldData = [];
		if (this.checkFieldSanity(formData, booleanDefiner) &&
		    this.checkFieldSanity(formData, booleanField)) formData[booleanDefiner].forEach((definerItem) => {
			booleanFieldData.push(!!booleanFieldDataDictionarified[definerItem]);
		});
		formData = {...props.formData, [booleanField]: booleanFieldData};

		return {schema, uiSchema, formData};
	}

	onChange(formData) {
		const {booleanField, booleanDefiner} = this.getUiOptions();
		const propsFormData = this.props.formData;

		let newData = this.props.formData[booleanField];
		// if the change happened in booleanField data, reflect the changes to all booleanField items with same data.
		if (JSON.stringify(propsFormData[booleanDefiner]) === JSON.stringify(formData[booleanDefiner])) {
			let dictionarifiedOrigData = this.getDictionarifiedFormData(propsFormData, booleanField);
			formData[booleanDefiner].forEach((definerItem, i) => {
				if (dictionarifiedOrigData[definerItem] && !formData[booleanField][i]) {
					newData = update(newData, {$splice: [[newData.indexOf(definerItem), 1]]});
				} else if (!dictionarifiedOrigData[definerItem] && formData[booleanField][i]) {
					newData = newData ? [...newData, definerItem] : [definerItem];
				}
			});
		}

		if (newData) newData = newData.filter(item => formData[booleanDefiner].includes(item));

		formData = {...formData, [booleanField]: newData};
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
		return this.getDictionarifiedFormData(formData, this.getUiOptions().booleanField);
	}

	checkFieldSanity = (formData, field) => {
		return formData[field] && Array.isArray(formData[field]);
	}
}
