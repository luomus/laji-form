import * as React from "react";
import Calendar from "react-widgets/lib/Calendar";
import Popup from "react-widgets/lib/Popup";
import moment from "moment";
import momentLocalizer from "react-widgets-moment";
import { WidgetProps } from "../../types";
import { getUiOptions } from "../../utils";
import { getYearAndMonthDateFormat } from "./DateTimeWidget";
import * as PropTypes from "prop-types";

momentLocalizer();

type CalendarHandle = React.ElementRef<typeof Calendar> & {
	handleKeyDown: (event: React.KeyboardEvent) => void;
};

function getCalendarDate(value: string, format: string): Date | undefined {
	const yearAndMonthDateFormat: string = getYearAndMonthDateFormat(format);
	const yearFormat  = "YYYY";

	const formats = [
		format,
		format.replace("DD", "D"),
		format.replace("MM", "M"),
		format.replace("DD", "D").replace("MM", "M"),
		yearAndMonthDateFormat,
		yearAndMonthDateFormat.replace("MM", "M"),
		yearFormat
	];

	const date = moment(value, formats, true);
	return date.isValid() ? date.toDate() : undefined;
}

function FreeTextDateWidget(props: WidgetProps<string>) {
	const {id, value, onChange, disabled, readonly, required, formContext} = props;
	const dateFormat: string = getUiOptions(props.uiSchema).dateFormat || moment().locale(formContext.lang).localeData().longDateFormat("L");
	const placeholder: string = formContext.translations[dateFormat.toLowerCase()] || dateFormat;

	const [focused, setFocused] = React.useState(false);
	const [calendarOpen, setCalendarOpen] = React.useState(false);
	const [calendarDate, setCalendarDate] = React.useState<Date | undefined>();

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const calendarRef = React.useRef<CalendarHandle>(null);

	const calendarId = `${id}-calendar`;
	const activeDateId = `${calendarId}-active`;
	const text = value ?? "";
	const culture = formContext.lang === "en" ? "en-gb" : formContext.lang;

	React.useEffect(() => {
		if (disabled || readonly) {
			setCalendarOpen(false);
		}
	}, [disabled, readonly]);

	const focusInput = React.useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const openCalendar = React.useCallback(() => {
		if (!calendarOpen) {
			setCalendarDate(getCalendarDate(text, dateFormat));
			setCalendarOpen(true);
		}
	}, [calendarOpen, text, dateFormat]);

	const selectDate = React.useCallback((date?: Date) => {
		if (!date) return;
		onChange(moment(date).format(dateFormat));
		setCalendarOpen(false);
		focusInput();
	}, [onChange, focusInput, dateFormat]);

	const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape" && calendarOpen) {
			event.preventDefault();
			setCalendarOpen(false);
			focusInput();
		} else if (event.altKey && event.key === "ArrowDown" && !disabled && !readonly) {
			event.preventDefault();
			openCalendar();
		} else if (event.altKey && event.key === "ArrowUp" && calendarOpen) {
			event.preventDefault();
			setCalendarOpen(false);
			focusInput();
		} else if (calendarOpen && event.target === inputRef.current && !event.altKey) {
			calendarRef.current?.handleKeyDown(event);
		}
	}, [calendarOpen, disabled, readonly, focusInput, openCalendar]);

	const handleContainerFocus = React.useCallback(() => {
		setFocused(true);
	}, []);

	const handleContainerBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
		if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
			setFocused(false);
			setCalendarOpen(false);
		}
	}, []);

	const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		onChange(event.target.value);
	}, [onChange]);

	const toggleCalendar = React.useCallback(() => {
		focusInput();
		if (calendarOpen) {
			setCalendarOpen(false);
		} else {
			openCalendar();
		}
	}, [focusInput, calendarOpen, openCalendar]);

	return (
		<div className="date-widget">
			<div
				className={`rw-widget rw-datetimepicker${focused ? " rw-state-focus" : ""}${calendarOpen ? " rw-open" : ""}${disabled ? " rw-state-disabled" : ""}${readonly ? " rw-state-readonly" : ""}`}
				ref={containerRef}
				onKeyDown={handleKeyDown}
				onFocus={handleContainerFocus}
				onBlur={handleContainerBlur}
			>
				<div className="rw-widget-picker rw-widget-container">
					<input
						ref={inputRef}
						id={id}
						className="rw-input rw-widget-input"
						type="text"
						role="combobox"
						aria-haspopup="true"
						aria-expanded={calendarOpen}
						aria-owns={calendarOpen ? calendarId : undefined}
						aria-activedescendant={calendarOpen ? activeDateId : undefined}
						value={text}
						placeholder={placeholder}
						disabled={disabled}
						readOnly={readonly}
						required={required}
						onChange={handleChange}
					/>
					<span className="rw-select rw-select-bordered">
						<button
							className="rw-btn rw-btn-select"
							type="button"
							tabIndex={-1}
							aria-label={formContext.translations.ChooseDate}
							disabled={disabled || readonly}
							onClick={toggleCalendar}
						>
							<span className="rw-i rw-i-calendar" aria-hidden="true" />
						</button>
					</span>
				</div>
				<Popup open={calendarOpen} className="rw-calendar-popup">
					<Calendar
						ref={calendarRef}
						id={calendarId}
						value={calendarDate}
						culture={culture}
						tabIndex={-1}
						activeId={activeDateId}
						onChange={selectDate}
						onNavigate={focusInput}
					/>
				</Popup>
			</div>
		</div>
	);
}

FreeTextDateWidget.propTypes =  {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			dateFormat: PropTypes.string,
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string"])
	}).isRequired,
	value: PropTypes.string
};

export default FreeTextDateWidget;
