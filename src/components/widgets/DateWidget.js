import React from "react";
import moment from "moment";
import DateTimeWidget from "./DateTimeWidget";

export default (props) => (
	<DateTimeWidget
		{...props}
		onChange={value => props.onChange(value === null ? null : moment(value).format("YYYY-MM-DD"))}
		time={false}
	/>
);
