import React, { Component, PropTypes } from "react";
import moment from "moment";
import { Row, Col, FormGroup } from "react-bootstrap";
import DateWidget from "./DateWidget";
import TimeWidget from "./TimeWidget";

export default class SeparatedDateTimeWidget extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {value} = props;
		let date, time;
		if (value) {
			let splitted = value.split("T");
			if (splitted.length == 2) {
				time = moment(splitted[1], "HH:mm:ss.SSSZ").format("HH.mm");
			}
			date = moment(value).format("YYYY-MM-DD");
		}
		return {date, time};
	}

	onDateChange = (value) => {
		if (!value) this.props.onChange(null);
		this.props.onChange(this.state.time ? value + "T" + this.state.time : value);
	}

	onTimeChange = (value) => {
		if (!value) {
			this.props.onChange(this.state.date);
			return;
		}

		let momentData = moment(this.state.date + " " + value, "YYYY-MM-DD HH.mm");
		let data = momentData.toISOString();
		this.props.onChange(data);
	}

	render() {
		const hasDate = !!this.state.date;
		return (<Row>
			<Col lg={hasDate ? 6 : 12}>
				<FormGroup>
				<DateWidget onChange={this.onDateChange} value={this.state.date} registry={this.props.registry} />
				</FormGroup>
			</Col>
			{hasDate ?
				<Col lg={6}>
					<FormGroup>
					<TimeWidget onChange={this.onTimeChange} value={this.state.time} registry={this.props.registry} />
					</FormGroup>
				</Col> : null
			}
			</Row>);
	}
}
