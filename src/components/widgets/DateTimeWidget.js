import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
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
		this.format = "DD.MM.YYYY hh:mm:ss";
	}

	render() {
		const {value, readonly, onChange} = this.props;

		return (<DateTimePicker
			{...this.props}
			value={value ? Moment(value).toDate() : null}
			onChange={(value) => {
				if (value !== null && !Moment(value).isValid()) value = this.props.value;
				onChange(value === null ? null : Moment(value).toISOString())
			}}
			readOnly={readonly}
			placeholder={this.format}
			format={this.format}
		/>);
	}
}
