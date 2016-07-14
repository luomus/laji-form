import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import DateTimeWidget from "./DateTimeWidget";

export default class TimeWidget extends Component {
	constructor(props) {
		super(props);
		this.format = "HH.mm";
	}

	onChange = (value) => {
		this.props.onChange(value === null ? null : moment(value).format(this.format))
	}

	render() {
		return (<DateTimeWidget
			{...this.props}
			onChange={this.onChange}
			format={this.format}
			placeholder={this.format.toLowerCase()}
			value={this.props.value ? moment(this.props.value, "HH.mm") : null}
			calendar={false}
			registry={this.props.registry}
		/>);
	}
}
