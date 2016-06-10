import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import Moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import DateTimeWidget from "./DateTimeWidget";

export default class DateWidget extends Component {
	render() {
		let format = "DD.MM.YYYY";
		return (<DateTimeWidget
			{...this.props}
			onChange={(value) => {this.props.onChange(value === null ? null : Moment(value).format("YYYY-MM-DD"))}}
			format={format}
			placeholder={format}
		  time={false}
		/>);
	}
}
