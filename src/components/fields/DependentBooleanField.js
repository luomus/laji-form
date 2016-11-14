import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { shouldRender } from  "react-jsonschema-form/lib/utils"
import { getUiOptions, getInnerUiSchema } from "../../utils";
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
		let {uiSchema, formData} = props;
		const {booleanField, booleanDefiner} = getUiOptions(uiSchema);
		uiSchema = getInnerUiSchema(uiSchema);

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

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	onChange = (formData) => {
		const {booleanField, booleanDefiner} = getUiOptions(this.props.uiSchema);
		const propsFormData = this.props.formData;

		let origData = this.props.formData[booleanField];
		// if the change happened in booleanField data, reflect the changes to all booleanField items with same data.
		if (JSON.stringify(propsFormData[booleanDefiner]) === JSON.stringify(formData[booleanDefiner])) {
			let dictionarifiedOrigData = this.getDictionarifiedFormData(propsFormData, booleanField);
			formData[booleanDefiner].forEach((definerItem, i) => {
				if (dictionarifiedOrigData[definerItem] && !formData[booleanField][i]) {
					origData = update(origData, {$splice: [[origData.indexOf(definerItem), 1]]});
				} else if (!dictionarifiedOrigData[definerItem] && formData[booleanField][i]) {
					origData = origData ? [...origData, definerItem] : [definerItem];
				}
			})
		}

		formData = {...formData, [booleanField]: origData};
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
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<SchemaField {...this.props} {...this.state} />);
	}
}
