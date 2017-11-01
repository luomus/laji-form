import { Component } from "react";
import PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class SumField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				resultField: PropTypes.string.isRequired,
				summedFields: PropTypes.arrayOf(PropTypes.string).isRequired,
				summedProperty: PropTypes.string
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	};

	static getName() {return "SumField";}

	constructor(props) {
		super(props);
		let {formData} = props;

		const {resultField} = this.getUiOptions();
		let sum = formData[resultField];

		if (sum === undefined) {
			sum = this.getSum(formData);
			formData = {...formData, [resultField]: sum};
			if (sum !== undefined) {
				this.props.onChange(formData);
			}
		}
	}

	getStateFromProps({formData}) {
		const {resultField} = this.getUiOptions();
		return {prevResult: formData[resultField]};
	}

	onChange(formData) {
		const {resultField} = this.getUiOptions();
		if (formData[resultField] === this.state.prevResult) {
			formData = {...formData, [resultField]: this.getSum(formData)};
		}

		this.props.onChange(formData);
	}

	getSum = (formData) => {
		const {summedFields, resultField, summedProperty} = this.getUiOptions();
		const resultType = this.props.schema.properties[resultField].type;

		let result = 0;
		let allEmpty = true;
		summedFields.forEach(field => {
			if (formData[field] !== undefined) {
				if (summedProperty === "arrayLength") {
					result += formData[field].length;
				} else {
					result += Number(formData[field]);
				}
				allEmpty = false;
			}
		});

		result = allEmpty || isNaN(result) ? undefined : result;
		if (result !== undefined && resultType !== "number" && resultType !== "integer") {
			result = result + "";
		}

		return result;
	}
}
