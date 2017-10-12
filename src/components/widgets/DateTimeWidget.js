import React, { Component } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import { date as dateLocalizer } from "react-widgets/lib/util/localizers";
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
		time: true
	}

	constructor(props) {
		super(props);
		momentLocalizer(moment);
	}

	componentDidMount() {
		this.getContext().addFocusHandler(this.props.id, this.focus);
	}

	componentWillUnmount() {
		this.getContext().removeFocusHandler(this.props.id, this.focus);
	}

	focus = () => {
		this.dateTimePickerRef.focus();
	}

	getStateFromProps(props) {
		let localeFormats = moment().locale(props.formContext.lang)._locale._longDateFormat;
		const {translations} = props.formContext;

		let dateFormat = "";
		let timeFormat = "";
		let placeholder = "";
		if (props.calendar) {
			dateFormat += localeFormats.L;
			placeholder += translations.datePlaceholderDay;
		}
		if (props.time) {
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

	onToggle = p => {
		if (p !== false) this.toggle = p; //"time" or "calendar"
	}

	render() {
		const {value, readonly} = this.props;
		const {translations} = this.props.formContext;

		const onChange = value => {
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
		};

		const options = getUiOptions(this.props);
		const showTimeList = options.showTimeList !== undefined ? options.showTimeList : true;

		const getRef = (elem) => { this.dateTimePickerRef = elem; };
		const datePicker = (<DateTimePicker
			ref={getRef}
			calendar={this.state.calendar}
			time={this.state.time && showTimeList}
			format={this.state.inputFormat}
			timeFormat={this.state.timeFormat}
			placeholder={this.state.placeholder}
			onToggle={this.onToggle}
			onChange={onChange}
			value={value ? moment(value).toDate() : null}
			parse={this.parse}
			readOnly={readonly}
			culture={this.props.formContext.lang}
		  messages={{
		    calendarButton: translations.ChooseDate,
		    timeButton: translations.ChooseTime
		  }}
		/>);

		const {showButtons} = options;

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

	formatValue(value, options, props) {
		if (!value) return value;
		const {inputFormat: format} = DateTimeWidget.prototype.getStateFromProps({...props, calendar: true, time: true, value});
		return dateLocalizer.format(value, format, props.formContext.lang);
	}
}
