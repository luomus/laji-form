import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import DateTimeWidget from "./DateTimeWidget";

export default () => {
	const {value} = this.props;
	return (<DateTimeWidget
		{...this.props}
		onChange={value => this.props.onChange(value === null ? null : ("T" + moment(value).toISOString().split("T")[1]))}
		calendar={false}
		registry={this.props.registry}
		value={value ? (moment().format("YYYY-MM-DD") + value) : null}
	/>);
}
