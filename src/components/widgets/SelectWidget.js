import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import Combobox from "react-widgets/lib/Combobox";
import Multiselect from "react-widgets/lib/Multiselect";
import { Label } from "react-bootstrap";
import { TooltipComponent } from "../components";

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

	getStateFromProps(props) {
		let {options: {enumOptions}} = props;
		if (enumOptions && enumOptions[0] && isEmptyString(enumOptions[0].label)) {
			enumOptions = enumOptions.slice(1);
		}


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
			filter.forEach(_enum => { filterEnumsDictionary[_enum] = true; });

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
			enumOptions,
			value: props.value
		};
	}

	render() {
		const {
			schema,
			id,
			required,
			disabled,
			readonly,
			multiple,
			autofocus,
			formContext,
			selectProps
		} = this.props;
		const {enumOptions} = this.state;

		const commonOptions = {
			value: this.state.value,
			data: enumOptions,
			onChange: value => this.setState({value}),
			valueField: "value",
			textField: "label",
			disabled,
			readOnly: readonly,
			filter: "contains",
			messages: {
				open: this.props.formContext.translations.Open,
				emptyList: this.props.formContext.translations.NoResults,
				emptyFilter: this.props.formContext.translations.NoResults
			},
			suggest: true
		};

		const selectComponent = multiple ? (
			<Multiselect {...commonOptions} />
		) : (
			<Combobox
				{...commonOptions}
				ref={"combo"}
				onFocus={() => this.setState({open: true}, () => {
					findDOMNode(this.refs.combo.refs.inner.refs.input).select();
				})}
				onBlur={() => this.setState({open: false})}
				open={this.state.open}
				onToggle={() => {}}
				onChange={value => this.setState({value})}
				onSelect={() => this.setState({open: false})}
			/>
		);

		return (
			<TooltipComponent placement="top" trigger="hover"
			                  tooltip={(multiple || isEmptyString(this.props.value)) ? undefined : this.state.valsToItems[this.props.value].label} >
				<div>
					{selectComponent}
				</div>
			</TooltipComponent>
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
			labels: PropTypes.object,
		}).isRequired,
		value: PropTypes.any,
		required: PropTypes.bool,
		multiple: PropTypes.bool,
		autofocus: PropTypes.bool,
		onChange: PropTypes.func,
	};
}

export default SelectWidget;
