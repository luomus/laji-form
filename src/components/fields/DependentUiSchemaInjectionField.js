import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Makes it possible to have different uiSchema if the field matches or not matches the given regular expression
 */

@VirtualSchemaField
export default class ConditionField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				field: PropTypes.string,
				fieldPath: PropTypes.string,
				regexp: PropTypes.string.isRequired,
				ifTrueUiSchema: PropTypes.object,
				ifFalseUiSchema: PropTypes.object
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	};

	getStateFromProps(props) {
		const uiOptions = this.getUiOptions();
		let {uiSchema, formData} = props;

		let value;

		if (uiOptions.field) {
			value = Array.isArray(formData) ? formData[0][uiOptions.field] : formData[uiOptions.field];
		} else {
			const splits = uiOptions.fieldPath.split("/");
			value = formData;
			console.log(value);
			console.log(splits);
			for (let i = 0; i < splits.length; i++) {
				console.log(splits[i]);
				value = value[splits[i]];
			}
			console.log(value);
		}

		let addedUiSchema = (value && value.match(new RegExp(uiOptions.regex))) ? uiOptions.ifTrueUiSchema : uiOptions.ifFalseUiSchema;
		if (!addedUiSchema) addedUiSchema = {};

		uiSchema = this.mergeDeep({...uiSchema}, addedUiSchema);
		return {uiSchema};
	}

	onChange(formData) {
		this.props.onChange(formData);
	}

    /**
     * Simple object check.
     * @param item
     * @returns {boolean}
     */
	isObject = (item) => {
		return (item && typeof item === "object" && !Array.isArray(item));
	};

    /**
     * Deep merge two objects.
     * @param target
     * @param ...sources
     */
	mergeDeep = (target, ...sources) => {
		if (!sources.length) return target;
		const source = sources.shift();

		if (this.isObject(target) && this.isObject(source)) {
			for (const key in source) {
				if (this.isObject(source[key])) {
					if (!target[key]) Object.assign(target, { [key]: {} });
					this.mergeDeep(target[key], source[key]);
				} else {
					Object.assign(target, { [key]: source[key] });
				}
			}
		}

		return this.mergeDeep(target, ...sources);
	};
}

