import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import { FormGroup, ButtonGroup, Button } from "react-bootstrap";

const DATE_TIME_SEPARATOR = ", ";

export default class DateTimeWidget extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false,
		calendar: true,
		time: true,
		options: {showButtons: true}
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
		console.log(props);
		let localeFormats = moment().locale(props.formContext.lang)._locale._longDateFormat;
		const {translations} = props.formContext;

		const options = this.props.options;
		let showButtons = true;
		if (options && options.hasOwnProperty("showButtons") && !options.showButtons) showButtons = false;

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
		const format = `${dateFormat}${DATE_TIME_SEPARATOR}${timeFormat}`;

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
		const hasTime = value.includes(DATE_TIME_SEPARATOR);
		const momentFn = hasTime ? moment : moment.utc;
		let momentValue = momentFn(value, this.state.format);
		let isoValue = momentValue.toISOString();
		if (!hasTime) {
			isoValue = isoValue.split("T")[0];
		} else {
		}
		this.timeWritten = hasTime;
		return moment(isoValue).toDate();
	}

	render() {
		const {value, readonly, onChange} = this.props;
		const {translations} = this.props.formContext;

		const datePicker = (<DateTimePicker
			calendar={this.state.calendar}
			time={this.state.time}
			format={this.state.inputFormat}
			timeFormat={this.state.timeFormat}
			placeholder={this.state.placeholder}
			onToggle={p => {
				if (p !== false) this.toggle = p; //"time" or "calendar"
			}}
			onChange={value => {
				const momentValue = moment(value).parseZone();
				let formattedValue = momentValue.toISOString();
				if (value !== null && !momentValue.isValid()) {
					formattedValue = this.props.value;
				} else if ((!this.toggle && !this.timeWritten) ||
				 (this.toggle === "calendar" && (!this.props.value || !this.props.value.includes("T")))) {
					formattedValue = momentValue.format("YYYY-MM-DD");
				}
				onChange(value === null ? null : formattedValue);
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

		return this.props.options.showButtons ? (
			<div>
				<FormGroup>{datePicker}</FormGroup>
				<FormGroup bsClass="form-group date-time-buttons">
					<ButtonGroup>
						<Button onClick={this.setToday}>{translations.Today}</Button>
						<Button onClick={this.setYesterday}>{translations.Yesterday}</Button>
					</ButtonGroup>
				</FormGroup>
			</div>
		) : datePicker;
	}

	setToday = () => {
		this.props.onChange(moment().format("YYYY-MM-DD"));
	}

	setYesterday = () => {
		this.props.onChange(moment().subtract(1, "d").format("YYYY-MM-DD"));
	}
}
