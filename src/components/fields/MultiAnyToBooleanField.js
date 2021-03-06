import * as React from "react";
import BaseComponent from "../BaseComponent";
import * as PropTypes from "prop-types";
import { getUiOptions, formDataEquals } from "../../utils";
import AnyToBoolean from "./AnyToBooleanField";

@BaseComponent
export default class MultiAnyToBooleanField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				groups: PropTypes.arrayOf(
					PropTypes.shape({
						label: PropTypes.string,
						trueValue: PropTypes.any,
						falseValue: PropTypes.any,
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
				const trueIndex = trueValues.findIndex(trueValue => formDataEquals(value, trueValue, props.formContext, props.idSchema.$id));
				if (trueIndex !== -1) {
					groupsFormData[trueIndex] = value;
				} else {
					const falseIndex = falseValues.findIndex(falseValue => formDataEquals(value, falseValue, props.formContext, props.idSchema.$id));
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
		const {"ui:help": help} = this.props.uiSchema;
		return (
			<React.Fragment>
				<TitleField title={this.props.schema.title} help={help}/>
				<div className={"checkbox-row"}>
					{groups.map((group, idx) => {
						const {"ui:help": help, "ui:helpHoverable": helpHoverable, helpPlacement, ..._group} = group;
						const groupProps = {
							...this.props,
							schema: {...this.props.schema.items, title: group.label},
							uiSchema: {...this.props.uiSchema, "ui:options": {falseValue: undefined, ..._group}, "ui:help": help, "ui:helpHoverable": helpHoverable, "ui:helpPlacement": helpPlacement},
							formData: this.state.groupsFormData[idx],
							onChange: this.onChange(idx)
						};

						return (
							<React.Fragment key={idx}>
								<AnyToBoolean {...groupProps} />
							</React.Fragment>
						);
					})}
				</div>
			</React.Fragment>
		);
	}
}
