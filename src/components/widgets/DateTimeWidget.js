import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
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
		this.format = "DD.MM.YYYY, HH.mm";
		this.placeholder = "DD.MM.YYYY, hh.mm";
	}

	render() {
		const {value, readonly, onChange} = this.props;

		return (<DateTimePicker
			format={this.format}
			placeholder={this.placeholder}
			{...this.props}
			onChange={(value, rawValue) => {
				if (value !== null && !moment(value).isValid()) value = this.props.value;
				onChange(value === null ? null : moment(value).toISOString())
			}}
			value={value ? moment(value).toDate() : null}
			readOnly={readonly}
			culture={this.props.registry.lang}
		/>);
	}
}
