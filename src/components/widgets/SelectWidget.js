import React, { Component } from "react";
import PropTypes from "prop-types";
import { findDOMNode } from "react-dom";
import Combobox from "react-widgets/lib/Combobox";
import Multiselect from "react-widgets/lib/Multiselect";
import { TooltipComponent } from "../components";

import { isEmptyString, getUiOptions, isNullOrUndefined } from "../../utils";
import BaseComponent from "../BaseComponent";

@BaseComponent
class SelectWidget extends Component {

	static defaultProps = {
		selectOnChange: true
	}

	componentDidMount() {
		this.getContext().addFocusHandler(this.props.id, this.onFocus);
	}

	componentWillUnmount() {
		this.getContext().removeFocusHandler(this.props.id, this.onFocus);
	}

	getStateFromProps(props) {
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

	multiSelectOnChange = (values) => this.props.onChange(values.map(({value}) => value))

	selectOnChange = (item) => {
		this.setState({value: item}, () => {
			this.props.selectOnChange && !isNullOrUndefined(item.value) && this.props.onChange(item.value);
		});
	}

	onClick = () => {
		this.setState({open: true});
	}

	onFocus = () => this.setState({open: true}, () => {
		findDOMNode(this.comboRef.refs.inner.refs.input).select();
	})

	onBlur = () => {
		this.setState({value: this.state.valsToItems[this.props.value]});
	}

	onSelect = (item) => {
		this.state.open && this.getContext().setImmediate(() => this.setState({open: false}));
		if (!this.props.selectOnChange) {
			this.props.onChange(item.value);
		}
	}

	onToggle = () => {
		this.setState({open: false});
	};

	getRef = elem => this.comboRef = elem;

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
			placeholder: getUiOptions(this.props).placeholder,
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
				onChange={this.multiSelectOnChange}
			/>
		) : (
			<Combobox
				{...commonOptions}
				onChange={this.selectOnChange}
				ref={this.getRef}
				open={this.state.open}
				onToggle={this.onToggle}
				onClick={this.onClick}
				onFocus={this.onFocus}
				onBlur={this.onBlur}
				onSelect={this.onSelect}
				suggest={true}
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
