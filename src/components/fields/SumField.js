import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";

const sumPropType = PropTypes.shape({
	resultField: PropTypes.string.isRequired,
	summedFields: PropTypes.arrayOf(PropTypes.string).isRequired,
	summedProperty: PropTypes.string
});

@VirtualSchemaField
export default class SumField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": {
				"sums": PropTypes.oneOfType([
					sumPropType,
					PropTypes.arrayOf(sumPropType)
				]).isRequired
			},
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	};

	static getName() {return "SumField";}

	getStateFromProps({formData}) {
		return {prevResult: this.getSums(formData)};
	}

	onChange(formData) {
		let {sums} = this.getUiOptions();
		sums = Array.isArray(sums) ? sums : [sums];

		const newSums = this.getSums(formData);
		sums.forEach(options => {
			if (newSums[options.resultField] !== this.state.prevResult[options.resultField]) {
				formData = {...formData, [options.resultField]: newSums[options.resultField]};
			}
		});

		this.props.onChange(formData);
	}

	getSums = (formData) => {
		let {sums} = this.getUiOptions();
		sums = Array.isArray(sums) ? sums : [sums];

		const results = {};

		sums.forEach(options => {
			const {resultField, summedFields, summedProperty} = options;
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

			results[resultField] = result;
		});

		return results;
	}
}
