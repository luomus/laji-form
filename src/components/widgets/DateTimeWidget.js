import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";

export default class DateTimeWidget extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false,
		calendar: true,
		time: true
	}

	constructor(props) {
		super(props);
		momentLocalizer(moment);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let localeFormats = moment().locale(props.registry.lang)._locale._longDateFormat;
		const {translations} = props.registry;
		let format = "";
		let placeholder = "";
		if (this.props.calendar) {
			format += localeFormats.L;
			placeholder += translations.datePlaceholderDay;
		}
		if (this.props.time) {
			if (placeholder) placeholder += ", ";
			if (format) format += ", ";
			format += localeFormats.LT;
			placeholder += translations.timePlaceholderDay;
		}
		format = format.replace("YYYY", "Y")
		return {format, placeholder}
	}

	render() {
		const {value, readonly, onChange} = this.props;

		return (<DateTimePicker
			{...this.props}
			{...this.state}
			placeholder={this.state.placeholder}
			onChange={value => {
				if (value !== null && !moment(value).isValid()) value = this.props.value;
				onChange(value === null ? null : moment(value).toISOString())
			}}
			value={value ? moment(value).toDate() : null}
			readOnly={readonly}
			culture={this.props.registry.lang}
		/>);
	}
}
