import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import * as DateTimePicker from "react-widgets/lib/DateTimePicker";
import * as moment from "moment";
import * as momentLocalizer from "react-widgets-moment";
import { date as dateLocalizer } from "react-widgets/lib/util/localizers";
import { getUiOptions, isDescendant, parseJSONPointer } from "../../utils";
import BaseComponent from "../BaseComponent";
import ReactContext from "../../ReactContext";

const DATE_TIME_SEPARATOR = ", ";
export const YEAR_MATCH = /^\d{4}$/;

@BaseComponent
export default class DateTimeWidget extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema:  PropTypes.shape({
			"ui:options": PropTypes.shape({
				showButtons: PropTypes.oneOfType([
					PropTypes.bool,
					PropTypes.shape({
						today: PropTypes.bool,
						yesterday: PropTypes.bool,
						same: PropTypes.oneOfType([
							PropTypes.bool,
							PropTypes.shape({
								path: PropTypes.string
							})
						])
					})
				]),
				showTimeList: PropTypes.bool,
				allowOnlyYear: PropTypes.bool,
				dateFormat: PropTypes.string
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
		this.props.formContext.services.focus.addFocusHandler(this.props.id, this.focus);
	}

	componentWillUnmount() {
		this.props.formContext.services.focus.removeFocusHandler(this.props.id, this.focus);
	}

	focus = () => {
		this.dateTimePickerRef.focus();
	}

	getStateFromProps(props) {
		const {lang, translations} = props.formContext;
		const formatLang = lang === "sv" ? "fi" : lang === "en" ? "en-gb" : lang;
		let localeFormats = moment().locale(formatLang)._locale._longDateFormat;

		let {allowOnlyYear, dateFormat = ""} = getUiOptions(props);

		let timeFormat = "";
		let placeholder = "";
		if (props.calendar) {
			if (!dateFormat) dateFormat = localeFormats.L;
			placeholder += translations[dateFormat.toLowerCase()] || dateFormat;
		}
		if (props.time) {
			timeFormat = localeFormats.LT;
			if (placeholder) placeholder += DATE_TIME_SEPARATOR;
			placeholder += translations[timeFormat.toLowerCase()] || timeFormat;
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
			if (prop in props) {
				state[prop] = props[prop];
				if (prop === "calendar") {
					state["date"] = props[prop];
				}
			}
		});

		return state;
	}

	parse = (value) => {
		if (!value) value = "";
		const {allowOnlyYear} = getUiOptions(this.props);
		const hasTime = value.includes(DATE_TIME_SEPARATOR) || this.state.time && !this.state.calendar;
		const onlyYear = allowOnlyYear && this.state.calendar && value.match(YEAR_MATCH);
		let momentValue = moment(value, onlyYear ? "YYYY" : this.state.format);

		if (!momentValue.isValid()) {
			return "";
		}

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
		if (p !== false) this.toggle = p; //"time" or "date"
	}

	setRef = (elem) => {
		this.dateTimePickerRef = elem;
	}

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
			(this.toggle === "date" && (!this.props.value || !this.props.value.includes("T")))) {
			formattedValue = momentValue.format("YYYY-MM-DD");
		}
		this.onChange(!value ? undefined : formattedValue);
		this.toggle = undefined;
		this.timeWritten = false;
		this.onlyYearWritten = false;
	}

	render() {
		const {value, readonly, disabled} = this.props;
		const {translations, lang} = this.props.formContext;
		const momentValue = moment(value);

		if (!this.state.textInputFocused && value !== null && !momentValue.isValid()) {
			const {TextWidget} = this.props.registry.widgets;
			return <TextWidget {...this.props} onFocus={this.onTextWidgetFocus} />;
		}


		const options = getUiOptions(this.props);
		const showTimeList = options.showTimeList !== undefined ? options.showTimeList : true;
		const culture = lang === "en" ? "en-gb" : lang;

		const datePicker = (<DateTimePicker
			ref={this.setRef}
			date={this.state.calendar}
			time={this.state.time && showTimeList}
			format={this.state.inputFormat}
			timeFormat={this.state.timeFormat}
			placeholder={this.state.placeholder}
			onToggle={this.onToggle}
			onChange={this.onDateTimePickerChange}
			value={value && momentValue.isValid() ? momentValue.toDate() : null}
			parse={this.parse}
			disabled={readonly || disabled}
			culture={culture}
		  messages={{
		    calendarButton: translations.ChooseDate,
		    timeButton: translations.ChooseTime
		  }}
			onBlur={this.onBlur} 
		/>);

		const {showButtons} = options;
		const {ButtonGroup} = this.context.theme;

		return showButtons ? (
			<div className="date-widget" ref={this.setContainerRef}>
				<div className="date-picker">
					{datePicker}
				</div>
				<ButtonGroup>
					{this.renderButtons(showButtons)}
				</ButtonGroup>
			</div>
		) : <div className="date-widget">{datePicker}</div>;
	}

	renderButtons(showButtons) {
		const {readonly, disabled} = this.props;
		const {translations} = this.props.formContext;
		const buttonDefinitions = {
			today: {
				className: "today",
				label: translations.Today,
				onClick: this.setToday
			},
			yesterday: {
				className: "yesterday",
				label: translations.Yesterday,
				onClick: this.setYesterday
			},
			same: {
				className: "same",
				label: translations.Same,
				onClick: this.setSameAsToday
			},
			plusSixMonths: {
				className: "plus-six-months",
				label: translations.plusSixMonths,
				onClick: this.setPlusSixMonths
			},
			plusYear: {
				className: "plus-year",
				label: translations.plusYear,
				onClick: this.setPlusYear
			}
		};

		const options = showButtons === true
			? {today: true, yesterday: true}
			: showButtons;

		const {Button} = this.context.theme;
		return Object.keys(options)
			.filter(name => options[name])
			.map(name => buttonDefinitions[name])
			.map(({className, onClick, label}) => (
				<Button key={className} className={className} onClick={onClick} disabled={readonly || disabled}>{label}</Button>
			));
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

	setSameAsToday = () => {
		const formData = this.props.formContext.services.rootInstance.getFormData();
		const sameOptions = getUiOptions(this.props).showButtons.same || {};
		const {path = "/gatheringEvent/dateBegin"} = sameOptions;
		const today = parseJSONPointer(formData, path, !!"safely");
		if (today) {
			this.onChange(today);
		}
	}

	setPlusSixMonths = () => {
		this.onChange(this.getCurrentDateOrNow().add(6, "M").format("YYYY-MM-DD"));
	}

	setPlusYear = () => {
		this.onChange(this.getCurrentDateOrNow().add(1, "y").format("YYYY-MM-DD"));
	}

	formatValue(value, options, props) {
		if (!value) return value;
		const {inputFormat: format} = DateTimeWidget.prototype.getStateFromProps({...props, date: true, time: true, value});
		return dateLocalizer.format(value, format, props.formContext.lang);
	}

	getCurrentDateOrNow() {
		const date = moment(this.props.value);
		if (date.isValid()) {
			return date;
		}
		return moment();
	}
}
