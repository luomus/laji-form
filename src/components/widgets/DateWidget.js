import React from "react";
import moment from "moment";
import DateTimeWidget from "./DateTimeWidget";
import { isEmptyString } from "../../utils";

const onChange = onChange => value => {
	onChange(isEmptyString(value) ? undefined : (moment(value).format("YYYY-MM-DD")));
};
export default (props) => (
	<DateTimeWidget
		{...props}
		onChange={onChange(props.onChange)}
		time={false}
		value={props.value ? moment(props.value).format("YYYY-MM-DD") : null}
	/>
);
