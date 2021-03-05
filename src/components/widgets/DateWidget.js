import * as React from "react";
import * as PropTypes from "prop-types";
import * as moment from "moment";
import DateTimeWidget, { YEAR_MATCH } from "./DateTimeWidget";
import { isEmptyString, getUiOptions } from "../../utils";

const format = (allowOnlyYear, value) => moment(value).format(
	allowOnlyYear && value.match(YEAR_MATCH)
		? "YYYY"
		: "YYYY-MM-DD"
);

const DateWidget = (props) => {
	const {onChange} = props;
	const {allowOnlyYear} = getUiOptions(props);
	const _onChange = React.useCallback(
		(value) => onChange(isEmptyString(value) ? undefined : format(allowOnlyYear, value)),
		[allowOnlyYear, onChange]
	);
	return (
		<DateTimeWidget
			{...props}
			onChange={_onChange}
			time={false}
			value={props.value ? format(allowOnlyYear, props.value) : null}
		/>
	);
};

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
