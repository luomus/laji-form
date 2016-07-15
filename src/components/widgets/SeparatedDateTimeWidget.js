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
				time = "T" + splitted[1];
			}
			date = splitted[0];
		}
		return {date, time};
	}

	onDateChange = (value) => {
		this.props.onChange(value ? (this.state.time ? value + this.state.time : value) : null);
	}

	onTimeChange = (value) => {
		this.props.onChange(value ? this.state.date + value : this.state.date);
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
