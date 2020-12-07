import * as React from "react";
import * as PropTypes from "prop-types";
import * as moment from "moment";
import DateTimeWidget from "./DateTimeWidget";
import { isEmptyString } from "../../utils";

const onChange = onChange => value => {
	onChange(isEmptyString(value) ? undefined : (moment(value).format("YYYY-MM-DD")));
};
const DateWidget = (props) => (
	<DateTimeWidget
		{...props}
		onChange={onChange(props.onChange)}
		time={false}
		value={props.value ? moment(props.value).format("YYYY-MM-DD") : null}
	/>
);
DateWidget.propTypes = {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			showButtons: PropTypes.bool
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}),
	value: PropTypes.string
};
export default DateWidget;
