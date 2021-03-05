import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import * as DateTimePicker from "react-widgets/lib/DateTimePicker";
import * as moment from "moment";
import * as momentLocalizer from "react-widgets/lib/localizers/moment";
import { date as dateLocalizer } from "react-widgets/lib/util/localizers";
import { ButtonGroup, Button } from "react-bootstrap";
import { getUiOptions, isDescendant } from "../../utils";
import BaseComponent from "../BaseComponent";

const DATE_TIME_SEPARATOR = ", ";
export const YEAR_MATCH = /^\d{4}$/;

@BaseComponent
export default class DateTimeWidget extends React.Component {
	static propTypes = {
		uiSchema:  PropTypes.shape({
			"ui:options": PropTypes.shape({
				showButtons: PropTypes.bool,
				showTimeList: PropTypes.bool,
				allowOnlyYear: PropTypes.bool
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}),
		value: PropTypes.string
	}

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
		const {lang} = props.formContext;
		let localeFormats = moment().locale(lang === "sv" ? "fi" : lang)._locale._longDateFormat;
		const {translations} = props.formContext;
		const {allowOnlyYear} = getUiOptions(props);

		let dateFormat = "";
		let timeFormat = "";
		let placeholder = "";
		if (props.calendar) {
			dateFormat += translations.DateLocale;
			placeholder += translations.datePlaceholderDay;
		}
		if (props.time) {
			if (placeholder) placeholder += DATE_TIME_SEPARATOR;
			placeholder += translations.timePlaceholderDay;
			timeFormat = localeFormats.LT;
		}

		const format = `${dateFormat}${dateFormat ? DATE_TIME_SEPARATOR : ""}${timeFormat}`;
		const splitted = props.value && props.value.split("T");
		const hasTime = props.value && splitted.length > 1 && splitted[1] !== "";

		let inputFormat = allowOnlyYear && props.value && props.value.match(YEAR_MATCH)
			? "YYYY"
			: hasTime
				? format
				: dateFormat;

		const state = {
			dateFormat,
			timeFormat,
			format,
			inputFormat,
			placeholder
		};

		["value", "disabled", "time", "calendar"].forEach(prop => {
			if (prop in props) state[prop] = props[prop];
		});

		return state;
	}

	parse = (value) => {
		if (!value) return undefined;
		const {allowOnlyYear} = getUiOptions(this.props);
		const hasTime = value.includes(DATE_TIME_SEPARATOR) || this.state.time && !this.state.calendar;
		const onlyYear = allowOnlyYear && this.state.calendar && value.match(YEAR_MATCH);
		let momentValue = moment(value, this.state.format);
		const isoValue = onlyYear
			? value
			: hasTime
				? momentValue.toISOString()
				: momentValue.format("YYYY-MM-DD");
		this.timeWritten = hasTime;
		this.onlyYearWritten = onlyYear;
		return onlyYear ? isoValue : moment(isoValue).toDate();
	}

	onChange = (value) => {
		this.props.onChange(value, !!"force");
	}

	onToggle = p => {
		if (p !== false) this.toggle = p; //"time" or "calendar"
	}

	setRef = (elem) => {
		this.dateTimePickerRef = elem;
	};
	setContainerRef = (elem) => {
		this.containerRef = elem;
	}

	onTextWidgetFocus = () => {
		this.setState({textInputFocused: true}, this.focus);
	}

	onBlur = () => {
		!isDescendant(findDOMNode(this.containerRef), document.activeElement) && this.setState({textInputFocused: false});
	}

	onDateTimePickerChange = (value) => {
		const momentValue = moment(value);
		let formattedValue = momentValue.format("YYYY-MM-DDTHH:mm");
		if (this.onlyYearWritten) {
			formattedValue = value;
		} else if (value !== null && !momentValue.isValid()) {
			formattedValue = this.props.value;
		} else if ((!this.toggle && !this.timeWritten) ||
			(this.toggle === "calendar" && (!this.props.value || !this.props.value.includes("T")))) {
			formattedValue = momentValue.format("YYYY-MM-DD");
		}
		this.onChange(!value ? undefined : formattedValue);
		this.toggle = undefined;
		this.timeWritten = false;
		this.onlyYearWritten = false;
	}

	render() {
		const {value, readonly, disabled} = this.props;
		const {translations} = this.props.formContext;
		const momentValue = moment(value);

		if (!this.state.textInputFocused && value !== null && !momentValue.isValid()) {
			const {TextWidget} = this.props.registry.widgets;
			return <TextWidget {...this.props} onFocus={this.onTextWidgetFocus} />;
		}


		const options = getUiOptions(this.props);
		const showTimeList = options.showTimeList !== undefined ? options.showTimeList : true;

		const datePicker = (<DateTimePicker
			ref={this.setRef}
			calendar={this.state.calendar}
			time={this.state.time && showTimeList}
			format={this.state.inputFormat}
			timeFormat={this.state.timeFormat}
			placeholder={this.state.placeholder}
			onToggle={this.onToggle}
			onChange={this.onDateTimePickerChange}
			value={value && momentValue.isValid() ? momentValue.toDate() : null}
			parse={this.parse}
			disabled={readonly || disabled}
			culture={this.props.formContext.lang}
		  messages={{
		    calendarButton: translations.ChooseDate,
		    timeButton: translations.ChooseTime
		  }}
			onBlur={this.onBlur} 
		/>);

		const {showButtons} = options;

		return showButtons ? (
			<div className="date-widget" ref={this.setContainerRef}>
				<div className="date-picker">
					{datePicker}
				</div>
				<ButtonGroup>
					<Button className="today" onClick={this.setToday} disabled={readonly || disabled}>{translations.Today}</Button>
					<Button className="yesterday" onClick={this.setYesterday} disabled={readonly || disabled}>{translations.Yesterday}</Button>
				</ButtonGroup>
			</div>
		) : <div className="date-widget">{datePicker}</div>;
	}

	getDateWithCurrentTime = (date) => {
		const {value} = this.props;
		const time = value !== undefined && value !== null ? value.split("T")[1] : false;
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
