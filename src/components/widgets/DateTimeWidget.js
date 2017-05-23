import React, { Component } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import moment from "moment";
import momentLocalizer from "react-widgets-moment";
import { ButtonGroup, Button } from "react-bootstrap";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";

const DATE_TIME_SEPARATOR = ", ";

@BaseComponent
export default class DateTimeWidget extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false,
		calendar: true,
		time: true,
	}

	constructor(props) {
		super(props);
		momentLocalizer(moment);
	}

	getStateFromProps(props) {
		let localeFormats = moment().locale(props.formContext.lang)._locale._longDateFormat;
		const {translations} = props.formContext;

		let dateFormat = "";
		let timeFormat = "";
		let placeholder = "";
		if (this.props.calendar) {
			dateFormat += localeFormats.L;
			placeholder += translations.datePlaceholderDay;
		}
		if (this.props.time) {
			if (placeholder) placeholder += DATE_TIME_SEPARATOR;
			placeholder += translations.timePlaceholderDay;
			timeFormat = localeFormats.LT;
		}

		dateFormat = dateFormat.replace("YYYY", "Y");

		let inputFormat = dateFormat;
		const format = `${dateFormat}${dateFormat ? DATE_TIME_SEPARATOR : ""}${timeFormat}`;

		if (props.value) {
			const splitted = props.value.split("T");
			const hasTime = splitted.length > 1 && splitted[1] !== "";
			if (hasTime) {
				inputFormat = format;
			}
		}

		const state = {
			dateFormat,
			timeFormat,
			format,
			inputFormat,
			placeholder
		};

		["value", "disabled", "time", "calendar"].forEach(prop => {
			if (props.hasOwnProperty(prop)) state[prop] = props[prop];
		});

		return state;
	}

	parse = (value) => {
		if (!value) return undefined;
		const hasTime = value.includes(DATE_TIME_SEPARATOR) || this.state.time && !this.state.calendar;
		let momentValue = moment(value, this.state.format);
		let isoValue = undefined;
		if (hasTime) {
			isoValue = momentValue.toISOString();
		} else {
			isoValue = momentValue.format("YYYY-MM-DD");
		}
		this.timeWritten = hasTime;
		return moment(isoValue).toDate();
	}

	onChange = (value) => {
		this.props.onChange(value, !!"force");
	}

	render() {
		const {value, readonly} = this.props;
		const {translations} = this.props.formContext;

		const datePicker = (<DateTimePicker
			date={this.state.calendar}
			time={this.state.time}
			format={this.state.inputFormat}
			timeFormat={this.state.timeFormat}
			placeholder={this.state.placeholder}
			onToggle={p => {
				if (p !== false) this.toggle = p; //"time" or "calendar"
			}}
			onChange={value => {
				const momentValue = moment(value);
				let formattedValue = momentValue.format("YYYY-MM-DDTHH:mm");
				if (value !== null && !momentValue.isValid()) {
					formattedValue = this.props.value;
				} else if ((!this.toggle && !this.timeWritten) ||
				 (this.toggle === "calendar" && (!this.props.value || !this.props.value.includes("T")))) {
					formattedValue = momentValue.format("YYYY-MM-DD");
				}
				this.onChange(!value ? undefined : formattedValue);
				this.toggle = undefined;
				this.timeWritten = false;
			}}
			value={value ? moment(value).toDate() : null}
			parse={this.parse}
			readOnly={readonly}
			culture={this.props.formContext.lang}
		  messages={{
		    calendarButton: translations.ChooseDate,
		    timeButton: translations.ChooseTime
		  }}
		/>);

		const {showButtons} = getUiOptions(this.props);

		return showButtons ? (
			<div className="date-widget">
				<div className="date-picker">
					{datePicker}
				</div>
				<ButtonGroup>
					<Button onClick={this.setToday}>{translations.Today}</Button>
					<Button onClick={this.setYesterday}>{translations.Yesterday}</Button>
				</ButtonGroup>
			</div>
		) : datePicker;
	}

	getDateWithCurrentTime = (date) => {
		const time = this.props.value !== undefined ? this.props.value.split("T")[1] : false;
		return time ? `${date}T${time}` : date;
	}

	setToday = () => {
		this.onChange(this.getDateWithCurrentTime(moment().format("YYYY-MM-DD")));
	}

	setYesterday = () => {
		this.onChange(this.getDateWithCurrentTime(moment().subtract(1, "d").format("YYYY-MM-DD")));
	}
}
