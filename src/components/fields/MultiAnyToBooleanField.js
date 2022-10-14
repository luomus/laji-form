import * as React from "react";
import BaseComponent from "../BaseComponent";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import AnyToBoolean from "./AnyToBooleanField";
import { getTemplate } from "@rjsf/utils";
import ReactContext from "../../ReactContext";

@BaseComponent
export default class MultiAnyToBooleanField extends React.Component {
	static contextType = ReactContext;
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
		this.state = {};
	}

	componentDidMount() {
		this.setState(this.getInitialState(this.props));
	}

	getInitialState(props) {
		// Context initializes on mount so we can't define the state before that. State is reset at mount.
		if (!this.context) {
			return {}
		}
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
				const trueIndex = trueValues.findIndex(trueValue => this.context.utils.formDataEquals(value, trueValue, props.idSchema.$id));
				if (trueIndex !== -1) {
					groupsFormData[trueIndex] = value;
				} else {
					const falseIndex = falseValues.findIndex(falseValue => this.context.formDataEquals(value, falseValue, props.idSchema.$id));
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
		// State initialization is dependent on context which initializes after first render, so we wait for that.
		if (!this.state.groupsFormData) {
			return null;
		}

		const TitleFieldTemplate = getTemplate("TitleFieldTemplate", this.props.registry, getUiOptions(this.props.uiSchema));
		let {groups} = getUiOptions(this.props.uiSchema) || [];
		return (
			<React.Fragment>
				<TitleFieldTemplate title={this.props.schema.title} uiSchema={this.props.uiSchema} />
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
