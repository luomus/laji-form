import React, { Component } from "react";
import PropTypes from "prop-types";
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

		const splitFormData = [];
		const splitUiSchemas = [];
		const splitSchemas = [];


		for (let i = 0; i <= uiOptions.splitRule.rules.length; i++) {
			splitFormData.push([]);
			const addedOptions = uiOptions.uiOptions && uiOptions.uiOptions.length > i ? uiOptions.uiOptions[i] : {};
			splitUiSchemas[i] = {...uiSchema, "ui:options": {...addedOptions}};
			splitSchemas[i] = {...schema};
			if (addedOptions.title) splitSchemas[i].title = addedOptions.title;
		}

		for (let i = 0; i < formData.length; i++) {
			const value = this.getValueFromPath(formData[i], uiOptions.splitRule.fieldPath);
			let noMatch = true;

			for (let j = 0; j < uiOptions.splitRule.rules.length; j++) {
				if (value && value.match(uiOptions.splitRule.rules[j])) {
					splitFormData[j].push({...formData[i]});
					noMatch = false;
					break;
				}
			}

			if (noMatch) splitFormData[splitFormData.length - 1].push({...formData[i]});
		}

		return {splitSchemas, splitUiSchemas, splitFormData};
	}

	render() {
		const {props, state} = this;
		const onChange = [];

		const {registry: {fields: {ArrayField}}} = this.props;

		for (let i = 0; i < state.splitSchemas.length; i++) {
			onChange[i] = (formData) => {
				const {state, props} = this;
				let newFormData = [];

				for (let j = 0; j < state.splitFormData.length; j++) {
					if (j !== i) {
						newFormData = newFormData.concat(state.splitFormData[j]);
					} else {
						newFormData = newFormData.concat(formData);
						this.setState((state) => {state.splitFormData[i] = formData; return state;});
					}
				}
				props.onChange(newFormData);
			};
		}

		return (
			<div>
                {state.splitSchemas.map((schema, i) =>
					<div key={i} className={state.splitUiSchemas[i]["ui:options"].classNames}>
						<ArrayField {...props}
									schema={schema}
									idSchema={{...this.props.idSchema, "$id": this.props.idSchema.$id + "_" + i}}
									formData={state.splitFormData[i]}
									uiSchema={state.splitUiSchemas[i]}
									onChange={onChange[i]}/>
						</div>
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
