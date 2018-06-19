import React from "react";
import moment from "moment";
import DateTimeWidget from "./DateTimeWidget";
import { isEmptyString } from "../../utils";

const onChange = onChange => value => {
	onChange(isEmptyString(value) ? '' : (moment(value).format("HH:mm")));
};

export default (props) => (
	<DateTimeWidget
		{...props}
		onChange={onChange(props.onChange)}
		calendar={false}
		value={props.value ? (moment().format("YYYY-MM-DD") + `T${props.value}`) : null}
	/>
);

