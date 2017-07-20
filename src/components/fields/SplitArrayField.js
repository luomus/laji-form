import React, { Component } from "react";
import PropTypes from "prop-types";
import _ArrayField from "./ArrayField";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class SplitArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				splitRule: PropTypes.shape({
					fieldPath: PropTypes.string.isRequired,
					regexp: PropTypes.string.isRequired
				}).isRequired,
				uiOptions: PropTypes.arrayOf(PropTypes.object)
			})
		}).isRequired
	};

	getStateFromProps(props) {
		let {schema, uiSchema, formData} = props;
		const uiOptions = getUiOptions(props.uiSchema);

		const firstFormData = [];
		const secondFormData = [];

		for (let i = 0; i < formData.length; i++) {
			const value = this.getValueFromPath(formData[i], uiOptions.splitRule.fieldPath);

			if (value && value.match(uiOptions.splitRule.regexp)) {
				firstFormData.push(formData[i]);
			} else {
				secondFormData.push(formData[i]);
			}
		}

		const firstUiSchema = {...uiSchema, "ui:options": {...uiOptions.uiOptions[0], renderer: "uncontrolled"}};
		const secondUiSchema = {...uiSchema, "ui:options": {...uiOptions.uiOptions[1], renderer: "uncontrolled"}};

		const secondSchema = {...schema};
		const firstSchema = {...schema};
		if (uiOptions.uiOptions[1].title) {
			secondSchema.title = uiOptions.uiOptions[1].title;
		}

		return {firstFormData, secondFormData, firstUiSchema, secondUiSchema, firstSchema, secondSchema};
	}

	render() {
		const {props, state} = this;

		return (
            <div>
                <_ArrayField {...props} formData={state.firstFormData} uiSchema={state.firstUiSchema} onChange={this.onFirstChange.bind(this)}/>
                <_ArrayField {...props} schema={state.secondSchema} formData={state.secondFormData} uiSchema={state.secondUiSchema} onChange={this.onSecondChange.bind(this)}/>
            </div>
		);
	}

	onFirstChange(formData) {
		const {state, props} = this;
		formData = state.secondFormData.concat(formData);
		this.setState((state) => {state.firstFormData = formData; return state;});
		props.onChange(formData);
	}

	onSecondChange(formData) {
		const {state, props} = this;
		formData = state.firstFormData.concat(formData);
		this.setState((state) => {state.secondFormData = formData; return state;});
		props.onChange(formData);
	}

	getValueFromPath = (obj, path) => {
		const splits = path.split("/");

		for (let i = 0; i < splits.length; i++) {
			if (!obj[splits[i]]) return "";

			obj = obj[splits[i]];
		}
		return obj;
	}
}
