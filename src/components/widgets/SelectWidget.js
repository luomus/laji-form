import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import Combobox from "react-widgets/lib/Combobox";
import Multiselect from "react-widgets/lib/Multiselect";
import { TooltipComponent } from "../components";

import { isEmptyString, getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";

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
			id,
			disabled,
			readonly,
			multiple,
			formContext,
		} = this.props;
		const {enumOptions} = this.state;

		const commonOptions = {
			id,
			value: this.state.value,
			data: enumOptions,
			valueField: "value",
			textField: "label",
			disabled,
			readOnly: readonly,
			filter: "contains",
			messages: {
				open: formContext.translations.Open,
				emptyList: formContext.translations.NoResults,
				emptyFilter: formContext.translations.NoResults
			}
		};

		const selectComponent = multiple ? (
			<Multiselect 
				{...commonOptions}
				onChange={(values) => this.props.onChange(values.map(({value}) => value))}
			/>
		) : (
			<Combobox
				{...commonOptions}
				onChange={({value}) => this.props.onChange(value)}
				ref={elem => this.comboRef = elem}
				open={this.state.open}
				onToggle={() => {}}
				suggest={true}
				onClick={() => this.setState({open: true})}
				onFocus={() => this.setState({open: true}, () => {
					findDOMNode(this.comboRef.refs.inner.refs.input).select();
				})}
				onBlur={() => {
					this.setState({open: false});
				}}
				onSelect={() => {
					this.state.open && setImmediate(() => this.setState({open: false}));
				}}
				onKeyDown={() => {
					!this.state.open && this.setState({open: true});
				}}
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
