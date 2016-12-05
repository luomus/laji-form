import React, {Component, PropTypes} from "react";
import { SimpleSelect, MultiSelect } from "react-selectize";
import { Label } from "react-bootstrap";

import {asNumber, shouldRender} from "react-jsonschema-form/lib/utils";
import {isEmptyString} from "../../utils";

/**
 * This is a silly limitation in the DOM where option change event values are
 * always retrieved as strings.
 */
function processValue({type, items}, value) {
	if (type === "array" && items && ["number", "integer"].includes(items.type)) {
		return value.map(asNumber);
	} else if (type === "boolean") {
		return value === "true";
	} else if (type === "number") {
		return asNumber(value);
	}
	return value;
}

//TODO doesn't support readonly
class SelectWidget extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const {options: {enumOptions}} = props;
		return {
			valsToItems: enumOptions.reduce((map, item) => {map[item.value] = item; return map;}, {}),
			value: props.value
		};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return shouldRender(this, nextProps, nextState);
	}

	render() {
		const {
			schema,
			id,
			options,
			required,
			disabled,
			multiple,
			autofocus,
			onChange,
			formContext,
			selectProps
		} = this.props;
		const value = this.state;
		const {enumOptions} = options;

		const commonProps = {
			theme: "bootstrap3",
			id,
			required,
			disabled,
			autofocus,
			options: enumOptions.filter(item => item.value !== "" && item.label !== ""),
			hideResetButton: isEmptyString(this.state.value),
			renderToggleButton: () => <span className="caret"/>,
			renderResetButton: () => <span>×</span>,
			renderNoResultsFound: () => <span className="text-muted">{formContext.translations.NoResults}</span>,
			...(selectProps || {})
		}

		return multiple ? (
			<MultiSelect
				{...commonProps}
				values={(this.state.value || []).map(value => this.state.valsToItems[value])}
				onValuesChange={items => {
					onChange(processValue(schema.type, (items || []).map(({value}) => value)));
				}}
				renderValue = {!multiple ? undefined : item => (
					<Label bsStyle="primary">
						<span>{item.label}</span>
						<span className="multiselect-close" onClick={() => {
							onChange(processValue(schema.type, this.state.value.filter(val => val !== item.value)));
						}}>×</span>
					</Label>
				)}
			/>
		) : (
			<SimpleSelect
				{...commonProps}
				cancelKeyboardEventOnSelection={false}
				value={this.state.valsToItems[this.state.value]}
				onValueChange={item => {
					onChange(processValue(schema.type, item ? item.value : ""));
				}}
			/>
		);
	}
}

SelectWidget.defaultProps = {
	autofocus: false,
};

if (process.env.NODE_ENV !== "production") {
	SelectWidget.propTypes = {
		schema: PropTypes.object.isRequired,
		id: PropTypes.string.isRequired,
		options: PropTypes.shape({
			enumOptions: PropTypes.array,
		}).isRequired,
		value: PropTypes.any,
		required: PropTypes.bool,
		multiple: PropTypes.bool,
		autofocus: PropTypes.bool,
		onChange: PropTypes.func,
	};
}

export default SelectWidget;
