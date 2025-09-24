import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { FieldProps } from "../../types";
import { getUiOptions} from "../../utils";
import moment from "moment";

@VirtualSchemaField
export default class FillDateRangeField extends React.Component<FieldProps> {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				dateBeginField: PropTypes.string.isRequired,
				dateEndField: PropTypes.string.isRequired
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object])
	};

	static getName() {return "FillDateRangeField";}

	getStateFromProps(props: FieldProps) {
		return {
			...props,
			onChange: this.onChange
		};
	}

	onChange = (formData: any) => {
		const {dateBeginField, dateEndField} = getUiOptions(this.props.uiSchema);

		const value = formData[dateBeginField];
        
		if (value) {
			let date = moment.utc(value, "YYYY", true);
			let unitOfTime: moment.unitOfTime.StartOf = "year";
            
			if (!date.isValid()) {
				date = moment.utc(value, "YYYY-MM", true);
				unitOfTime = "month";
			}
            
			if (date.isValid()) {
				formData = {
					...formData,
					[dateBeginField]: date.startOf(unitOfTime).format("YYYY-MM-DD"),
					[dateEndField]: date.endOf(unitOfTime).format("YYYY-MM-DD")
				};
			}
		}

		this.props.onChange(formData);
	};
}
