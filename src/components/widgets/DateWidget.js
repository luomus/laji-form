import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import DateTimeWidget from "./DateTimeWidget";
import { FormGroup, ButtonGroup, Button } from "react-bootstrap";

export default class DateWidget extends Component {

	render() {
		const options = this.props.options;
		let showButtons = true;
		if (options && options.hasOwnProperty("showButtons") && !options.showButtons) showButtons = false;

		const dateTimeWidget = (<DateTimeWidget
			{...this.props}
			onChange={value => this.props.onChange(value === null ? null : moment(value).format("YYYY-MM-DD"))}
		  time={false}
		  registry={this.props.registry}
		/>);

		return this.props.value ? dateTimeWidget :
			(<div><FormGroup>{dateTimeWidget}</FormGroup>
				{showButtons ? (
					<FormGroup bsClass="form-group date-time-buttons">
						<ButtonGroup>
								<Button onClick={this.setToday}>{this.props.formContext.translations.Today}</Button>
								<Button onClick={this.setYesterday}>{this.props.formContext.translations.Yesterday}</Button>
						</ButtonGroup>
					</FormGroup>) : null
					}
			</div>);
	}

	setToday = () => {
		this.props.onChange(moment().format("YYYY-MM-DD"));
	}

	setYesterday = () => {
		this.props.onChange(moment().subtract(1, "d").format("YYYY-MM-DD"));
	}
}
