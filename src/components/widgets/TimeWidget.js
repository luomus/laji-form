import React from "react";
import moment from "moment";
import DateTimeWidget from "./DateTimeWidget";

export default (props) => (
	<DateTimeWidget
		{...props}
		onChange={value => props.onChange(value === null ? null : ("T" + moment(value).toISOString().split("T")[1]))}
		calendar={false}
		value={props.value ? (moment().format("YYYY-MM-DD") + props.value) : null}
	/>
);
