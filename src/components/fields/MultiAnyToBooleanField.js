import React, { Component } from "react";
import BaseComponent from "../BaseComponent";
import PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import anyToBoolean from "./AnyToBooleanField";

@BaseComponent
export default class MultiAnyToBooleanField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				groups: PropTypes.arrayOf(
					PropTypes.shape({
						label: PropTypes.string,
						trueValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
						falseValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
						allowUndefined: PropTypes.bool
					})
				)
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	constructor(props) {
		super(props);
		this.state = this.getInitialState(props);
	}

	getInitialState(props) {
		let {groups} = getUiOptions(props.uiSchema) || [];
		const {formData} = props;

		const trueValues = groups.map(group => group.trueValue);
		const falseValues = groups.map(group => group.falseValue);
		const groupsFormData = [];

		if (formData) {
			formData.forEach(value => {
				if (value === undefined) {
					return;
				}

				const trueIndex = trueValues.indexOf(value);
				if (trueIndex !== -1) {
					groupsFormData[trueIndex] = value;
				} else {
					const falseIndex = falseValues.indexOf(value);
					if (falseIndex !== -1) {
						groupsFormData[falseIndex] = value;
					}
				}
			});
		}

		return {groupsFormData: groupsFormData};
	}

	onChange = (index) => (value) => {
		const groupsFormData = this.state.groupsFormData;
		groupsFormData[index] = value;
		this.setState({groupsFormData: groupsFormData});

		const formData = groupsFormData.reduce((arr, val) => {
			if (val !== undefined) {
				arr.push(val);
			}
			return arr;
		}, []);

		this.props.onChange(formData);
	}

	render() {
		const {TitleField} = this.props.registry.fields;
		let {groups} = getUiOptions(this.props.uiSchema) || [];
		return (
			<React.Fragment>
				<TitleField title={this.props.schema.title} />
				{groups.map((group, idx) => {
					const groupProps = {
						...this.props,
						schema: {...this.props.schema.items, title: group.label},
						uiSchema: {...this.props.uiSchema, "ui:options": group},
						formData: this.state.groupsFormData[idx],
						onChange: this.onChange(idx)
					};

					return (
						<React.Fragment key={idx}>
							{anyToBoolean(groupProps)}
						</React.Fragment>
					);
				})}
			</React.Fragment>
		);
	}
}
