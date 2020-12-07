import * as React from "react";
import * as PropTypes from "prop-types";
import * as moment from "moment";
import DateTimeWidget from "./DateTimeWidget";
import { isEmptyString } from "../../utils";

const onChange = onChange => value => {
	onChange(isEmptyString(value) ? undefined : (moment(value).format("HH:mm")));
};

const TimeWidget = (props) => (
	<DateTimeWidget
		{...props}
		onChange={onChange(props.onChange)}
		calendar={false}
		value={props.value ? (moment().format("YYYY-MM-DD") + `T${props.value}`) : null}
	/>
);
TimeWidget.propTypes = {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}),
	value: PropTypes.string
};

export default TimeWidget;
