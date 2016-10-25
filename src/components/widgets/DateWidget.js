import React from "react";
import moment from "moment";
import DateTimeWidget from "./DateTimeWidget";

export default () => (
	<DateTimeWidget
		{...this.props}
		onChange={value => this.props.onChange(value === null ? null : moment(value).format("YYYY-MM-DD"))}
		time={false}
		registry={this.props.registry}
	/>
);
