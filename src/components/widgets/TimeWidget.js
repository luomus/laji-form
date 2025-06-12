import * as React from "react";
import * as PropTypes from "prop-types";
import moment from "moment";
import DateTimeWidget from "./DateTimeWidget";
import { isEmptyString } from "../../utils";

const TimeWidget = (props) => {
	const {onChange} = props;
	const _onChange = React.useCallback(
		(value) => onChange(isEmptyString(value) ? undefined : (moment(value).format("HH:mm"))),
		[onChange]
	);
	return (
		<DateTimeWidget
			{...props}
			onChange={_onChange}
			calendar={false}
			value={props.value ? (moment().format("YYYY-MM-DD") + `T${props.value}`) : null}
		/>
	);
};
TimeWidget.propTypes = {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}),
	value: PropTypes.string
};

export default TimeWidget;
