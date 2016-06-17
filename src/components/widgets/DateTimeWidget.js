import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import Moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";

export default class DateTimeWidget extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false
	}

	constructor(props) {
		super(props);
		momentLocalizer(Moment);
		this.format = "DD.MM.YYYY, HH.mm.ss";
	}

	render() {
		const {value, readonly, onChange} = this.props;

		let placeholder = this.props.format || this.format;
		return (<DateTimePicker
			format={this.format}
			{...this.props}
			placeholder={placeholder}
			onChange={(value) => {
				if (value !== null && !Moment(value).isValid()) value = this.props.value;
				onChange(value === null ? null : Moment(value).toISOString())
			}}
			value={value ? Moment(value).toDate() : null}
			readOnly={readonly}
			culture="fi"
		/>);
	}
}
