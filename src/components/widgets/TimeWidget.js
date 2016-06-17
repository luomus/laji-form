import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import ReactWidgets from "react-widgets"
import moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";
import DateTimeWidget from "./DateTimeWidget";

export default class TimeWidget extends Component {
	constructor(props) {
		super(props);
		this.format = "HH.mm.ss";
		this.state = {value: null};
	}

	onChange = (value) => {
		this.setState({value});
		this.props.onChange(value === null ? null : moment(value).format(this.format))
	}

	render() {
		return (<DateTimeWidget
			{...this.props}
			onChange={this.onChange}
			format={this.format.toLowerCase()}
			placeholder={this.format}
			value={this.state.value ? moment(this.state.value).toDate() : null}
			calendar={false}
		/>);
	}
}
