import React, { Component, PropTypes } from "react";
import { SimpleSelect, MultiSelect } from "react-selectize";
import { Label } from "react-bootstrap";

import { asNumber } from "react-jsonschema-form/lib/utils";
import { isEmptyString, getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";

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
@BaseComponent
class SelectWidget extends Component {

	getStateFromProps = (props) => {
		let {options: {enumOptions}} = props;

		function sort(enumOptions, order) {
			if (!Array.isArray(order)) return enumOptions;

			const idxs = order.reduce((idxs, _enum, i) => {
				idxs[_enum] = i;
				return idxs;
			}, {});

			return enumOptions.slice(0).sort((a, b) => {
				return idxs[a.value] - idxs[b.value];
			});
		}

		const {filter, filterType = "blacklist", labels, order} = getUiOptions(props);

		if (filter) {
			const filterEnumsDictionary = {};
			filter.forEach(_enum => { filterEnumsDictionary[_enum] = true });

			const filterFn = ({value}) => filterEnumsDictionary[value];

			enumOptions = enumOptions.filter(filterType === "whitelist" ? filterFn : e => !filterFn(e));
		}

		if (labels) {
			enumOptions = enumOptions.map(({value, label}) => {
				return {value, label: labels.hasOwnProperty(value) ? labels[value] : label};
			});
		}

		if (order) enumOptions = sort(enumOptions, order);


		const valsToItems = enumOptions.reduce((map, item) => {
			map[item.value] = item;
			return map;
		}, {});

		return {
			valsToItems,
			enumOptions
		};
	}

	onChange = (value) => {
		this.props.onChange(value, !!"force");
	}

	render() {
		const {
			schema,
			id,
			required,
			disabled,
			multiple,
			autofocus,
			formContext,
			selectProps
		} = this.props;
		const {enumOptions} = this.state;


		const commonProps = {
			theme: "bootstrap3",
			id,
			required,
			disabled,
			autofocus,
			firstOptionIndexToHighlight: (index, options, value, search) => !value || isEmptyString(value.value) ? -1 : index,
			options: enumOptions.filter(item => item.value !== "" && item.label !== ""),
			hideResetButton: isEmptyString(this.props.value),
			renderToggleButton: () => <span className="caret"/>,
			renderResetButton: () => <span>×</span>,
			renderNoResultsFound: () => <span className="text-muted">{formContext.translations.NoResults}</span>,
			...(selectProps || {})
		};

		return multiple ? (
			<MultiSelect
				{...commonProps}
				value={(this.props.value || []).map(value => this.state.valsToItems[value])}
				onValuesChange={items => {
					this.onChange(processValue(schema.type, (items || []).map(({value}) => value)));
				}}
				renderValue = {!multiple ? undefined : item => (
					<Label bsStyle="primary">
						<span>{item.label}</span>
						<span className="multiselect-close" onClick={() => {
							this.onChange(processValue(schema.type, this.props.value.filter(val => val !== item.value)));
						}}>×</span>
					</Label>
				)}
			/>
		) : (
			<SimpleSelect
				{...commonProps}
				cancelKeyboardEventOnSelection={false}
				value={this.state.valsToItems[this.props.value]}
				onValueChange={item => {
					this.onChange(processValue(schema.type, item ? item.value : undefined));
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
			order: PropTypes.array,
			filter: PropTypes.array,
			filterType: PropTypes.string,
			labels: PropTypes.array,
		}).isRequired,
		value: PropTypes.any,
		required: PropTypes.bool,
		multiple: PropTypes.bool,
		autofocus: PropTypes.bool,
		onChange: PropTypes.func,
	};
}

export default SelectWidget;
