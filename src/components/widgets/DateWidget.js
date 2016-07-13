import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import DateTimeWidget from "./DateTimeWidget";
import { Row, Col, FormGroup, FormControl, ButtonToolbar, ButtonGroup, Button } from "react-bootstrap";
//import Button from "../Button";

export default class DateWidget extends Component {

	constructor(props) {
		super(props);
		this.format = "DD.MM.YYYY";
	}
	render() {
		const options = this.props.options;
		let showButtons = true;
		if (options && !options.showButtons) showButtons = false;

		const dateTimeWidget = (<DateTimeWidget
			{...this.props}
			onChange={(value) => {this.props.onChange(value === null ? null : moment(value).format(this.format))}}
			format={this.format}
			placeholder={this.format}
		  time={false}
		/>);

		return this.props.value ? dateTimeWidget :
			(<div className="form-inline"><FormGroup>{dateTimeWidget}</FormGroup>
				<FormGroup>
					<ButtonGroup>
							<Button onClick={this.setToday}>Tänään</Button>
							<Button onClick={this.setYesterday}>eilen</Button>
					</ButtonGroup>
				</FormGroup>
			</div>);
	}

	setToday = () => {
		this.props.onChange(moment().format(this.format));
	}
	setYesterday = () => {
		this.props.onChange(moment().subtract(1, "d").format(this.format));
	}
}
