import * as React from "react";
import * as PropTypes from "prop-types";
import { Row, Col, FormGroup } from "react-bootstrap";
import DateWidget from "./DateWidget";
import TimeWidget from "./TimeWidget";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class SeparatedDateTimeWidget extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		value: PropTypes.string
	}

	getStateFromProps(props) {
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
		return (
			<Row>
				<Col lg={hasDate ? 6 : 12}>
					<FormGroup>
						<DateWidget {...this.props} onChange={this.onDateChange} value={this.state.date} />
					</FormGroup>
				</Col>
				{hasDate ? (
					<Col lg={6}>
						<FormGroup>
							<TimeWidget {...this.props} onChange={this.onTimeChange} value={this.state.time} />
						</FormGroup>
					</Col>
				): null
				}
			</Row>
		);
	}
}
