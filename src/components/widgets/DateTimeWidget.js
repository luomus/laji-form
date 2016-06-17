import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import moment from "moment";
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
		momentLocalizer(moment);
		this.format = "DD.MM.YYYY, HH.mm.ss";
		this.placeholder = "DD.MM.YYYY, hh.mm.ss";
	}

	render() {
		const {value, readonly, onChange} = this.props;

		let placeholder = this.props.format || this.placeholder;
		return (<DateTimePicker
			format={this.format}
			{...this.props}
			placeholder={placeholder}
			onChange={(value) => {
				if (value !== null && !moment(value).isValid()) value = this.props.value;
				onChange(value === null ? null : moment(value).toISOString())
			}}
			value={value ? moment(value).toDate() : null}
			readOnly={readonly}
			culture="fi"
		/>);
	}
}
