import React from "react";
import moment from "moment";
import DateTimeWidget from "./DateTimeWidget";
import { isEmptyString } from "../../utils";

export default (props) => (
	<DateTimeWidget
		{...props}
		onChange={value => props.onChange(isEmptyString(value) ? null : moment(value).format("YYYY-MM-DD"))}
		time={false}
	/>
);
