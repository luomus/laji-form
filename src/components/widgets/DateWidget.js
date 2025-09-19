import * as React from "react";
import * as PropTypes from "prop-types";
import moment from "moment";
import DateTimeWidget, {YEAR_MATCH, YEAR_MONTH_MATCH} from "./DateTimeWidget";
import { isEmptyString, getUiOptions } from "../../utils";

const format = (allowOnlyYear, allowOnlyYearAndMonth, value) => {
	const momentValue = moment(value);
	if (!momentValue.isValid()) {
		return value;
	}

	return momentValue.format(
		allowOnlyYear && value.match(YEAR_MATCH)
			? "YYYY"
			: allowOnlyYearAndMonth && value.match(YEAR_MONTH_MATCH)
				? "YYYY-MM"
				: "YYYY-MM-DD"
	);
};

const DateWidget = (props) => {
	const {onChange} = props;
	const {allowOnlyYear, allowOnlyYearAndMonth} = getUiOptions(props);
	const _onChange = React.useCallback(
		(value) => onChange(isEmptyString(value) ? undefined : format(allowOnlyYear, allowOnlyYearAndMonth, value)),
		[allowOnlyYear, allowOnlyYearAndMonth, onChange]
	);
	return (
		<DateTimeWidget
			{...props}
			onChange={_onChange}
			time={false}
			value={props.value ? format(allowOnlyYear, allowOnlyYearAndMonth, props.value) : null}
		/>
	);
};

DateWidget.propTypes = {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			showButtons: PropTypes.oneOfType([
				PropTypes.bool,
				PropTypes.shape({
					today: PropTypes.bool,
					yesterday: PropTypes.bool,
					same: PropTypes.oneOfType([
						PropTypes.bool,
						PropTypes.shape({
							path: PropTypes.string
						})
					]),
					plusSixMonths: PropTypes.oneOfType([
						PropTypes.bool,
						PropTypes.shape({
							path: PropTypes.string
						})
					]),
					plusSixYear: PropTypes.oneOfType([
						PropTypes.bool,
						PropTypes.shape({
							path: PropTypes.string
						})
					])
				})
			]),
			allowOnlyYear: PropTypes.bool
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}),
	value: PropTypes.string
};
export default DateWidget;
