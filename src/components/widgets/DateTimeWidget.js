import React, { Component, PropTypes } from "react";
import DateTimePicker from "react-widgets/lib/DateTimePicker";
import Moment from "moment";
import momentLocalizer from "react-widgets/lib/localizers/moment";

import'react-widgets/lib/less/react-widgets.less'

export default class DateTimeWidget extends Component {
	static defaultProps = {
		type: "text",
		readonly: false,
		disabled: false,
		required: false
	}

	constructor(props) {
		super(props);
		momentLocalizer(Moment)
	}

	render() {
		const {value, readonly, onChange} = this.props;

		return (<DateTimePicker
			{...this.props}
			value={(value === "") ? null : Moment(value).toDate()}
			onChange={(value) => {
				if (!Moment(value).isValid()) value = this.props.value;
				onChange(Moment(value).toISOString())
			}}
			readOnly={readonly}
			format={"YYYY.MM.DD hh:mm:ss"}
		/>);
	}
}
