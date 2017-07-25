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
					rules: PropTypes.arrayOf(PropTypes.string).isRequired
				}).isRequired,
				uiOptions: PropTypes.arrayOf(PropTypes.object)
			})
		}).isRequired
	};

	getStateFromProps(props) {
		let {schema, uiSchema, formData} = props;
		const uiOptions = getUiOptions(props.uiSchema);

		const splittedFormData = [];
		const splittedUiSchemas = [];
		const splittedSchemas = [];

		for (let i = 0; i <= uiOptions.splitRule.rules.length; i++) {
			splittedFormData.push([]);
			splittedUiSchemas[i] = {...uiSchema, "ui:options": {...uiOptions.uiOptions[i]}};
			splittedSchemas[i] = {...schema};
			if (uiOptions.uiOptions[i].title) {
				splittedSchemas[i].title = uiOptions.uiOptions[i].title;
			}
		}

		for (let i = 0; i < formData.length; i++) {
			const value = this.getValueFromPath(formData[i], uiOptions.splitRule.fieldPath);
			let noMatch = true;

			for (let j = 0; j < uiOptions.splitRule.rules.length; j++) {
				if (value && value.match(uiOptions.splitRule.rules[j])) {
					splittedFormData[j].push({...formData[i]});
					noMatch = false;
					break;
				}
			}

			if (noMatch) splittedFormData[splittedFormData.length - 1].push({...formData[i]});
		}

		return {splittedSchemas, splittedUiSchemas, splittedFormData};
	}

	render() {
		const {props, state} = this;
		const onChange = [];

		for (let i = 0; i < state.splittedSchemas.length; i++) {
			onChange[i] = (formData) => {
				const {state, props} = this;
				let newFormData = [];

				for (let j = 0; j < state.splittedFormData.length; j++) {
					if (j !== i) {
						newFormData = newFormData.concat(state.splittedFormData[j]);
					} else {
						newFormData = newFormData.concat(formData);
						this.setState((state) => {state.splittedFormData[i] = formData; return state;});
					}
				}
				props.onChange(newFormData);
			};
		}

		return (
			<div>
                {state.splittedSchemas.map((schema, i) =>
					<_ArrayField key={i} {...props} schema={schema} formData={state.splittedFormData[i]} uiSchema={state.splittedUiSchemas[i]} onChange={onChange[i]}/>
				)}
			</div>
		);
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
