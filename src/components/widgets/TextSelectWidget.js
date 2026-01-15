import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";
import update from "immutability-helper";
import BaseInputTemplate from "../templates/BaseInputTemplate";
import ReactContext from "../../ReactContext";

class TextSelectWidget extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		value: PropTypes.string
	};

	constructor(props) {
		super(props);

		this.state = this.getInitialState(props);
	}

	UNSAFE_componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getInitialState(props) {
		let {enums = [], delimiter = ", ", freeTextField} = getUiOptions(props);
		const {value} = props;

		const selectedCheckboxes = new Set();

		const values = !value ? [] : value.split(delimiter);

		const otherValues = [];
		values.map(val => {
			if (enums.indexOf(val) !== -1) {
				selectedCheckboxes.add(val);
			} else {
				otherValues.push(val);
			}
		});
		if (otherValues.length > 0) {
			selectedCheckboxes.add(freeTextField);
		}

		return {selectedCheckboxes, enums, otherValue: otherValues.join(delimiter), freeTextField};
	}

	getStateFromProps(props) {
		let {enums = [], delimiter = ", "} = getUiOptions(props);
		const {value} = props;
		const values = !value ? [] : value.split(delimiter);

		const otherValues = [];

		values.map(val => {
			if (enums.indexOf(val) === -1) {
				otherValues.push(val);
			}
		});
		return {otherValue: otherValues.join(delimiter)};
	}

	render() {
		let {enums, otherValue, freeTextField, selectedCheckboxes} = this.state;

		if (freeTextField) {
			enums = update(enums, {$push: [freeTextField]});
		}

		const {Checkbox} = this.context.theme;

		return (
			<div className="laji-text-select">
				{enums.map((label, i) => {
					return (
						<Checkbox key={i}
							title={label}
							checked={selectedCheckboxes.has(label)}
							onChange={this.onCheckBoxChange(label)}>{label}</Checkbox>
					);
				})}
				{freeTextField ?
					<BaseInputTemplate
						{...this.props}
						id={this.props.id + "_input"}
						value={otherValue}
						onChange={this.onInputChange}
						disabled={!selectedCheckboxes.has(freeTextField)} />
					: null}
			</div>
		);
	}

	onCheckBoxChange = (label) => () => {
		const selectedCheckboxes = this.state.selectedCheckboxes;

		if (selectedCheckboxes.has(label)) {
			selectedCheckboxes.delete(label);
		} else {
			selectedCheckboxes.add(label);
		}

		this.setState({selectedCheckboxes: selectedCheckboxes});

		this.onChange(this.state.otherValue);
	};

	onInputChange = (value) => {
		this.onChange(value);
	};

	onChange = (textValue) => {
		let newValue = [...Array.from(this.state.selectedCheckboxes)];
		if (this.state.selectedCheckboxes.has(this.state.freeTextField)) {
			if (textValue && textValue.length > 0) {
				newValue = update(newValue, {$push: [textValue]});
			}
			newValue.splice(newValue.indexOf(this.state.freeTextField), 1);
		}
		this.props.onChange(newValue.join(", "));
	};
}

export default TextSelectWidget;
