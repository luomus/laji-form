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
		if (options && !options.showButtons) showButtons = false;

		const dateTimeWidget = (<DateTimeWidget
			{...this.props}
			onChange={value => this.props.onChange(value === null ? null : moment(value).format("YYYY-MM-DD"))}
		  time={false}
		  registry={this.props.registry}
		/>);

		return this.props.value ? dateTimeWidget :
			(<div className="form-inline"><FormGroup>{dateTimeWidget}</FormGroup>
				<FormGroup>
					<ButtonGroup>
							<Button onClick={this.setToday}>{this.props.registry.translations.today}</Button>
							<Button onClick={this.setYesterday}>{this.props.registry.translations.yesterday}</Button>
					</ButtonGroup>
				</FormGroup>
			</div>);
	}

	setToday = () => {
		this.props.onChange(moment().format("YYYY-MM-DD"));
	}

	setYesterday = () => {
		this.props.onChange(moment().subtract(1, "d").format("YYYY-MM-DD"));
	}
}
