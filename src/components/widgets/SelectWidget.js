import * as React from "react";
import * as PropTypes from "prop-types";
import * as Combobox from "react-widgets/lib/Combobox";
import * as Multiselect from "react-widgets/lib/Multiselect";
import { TooltipComponent } from "../components";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";

import { isEmptyString, getUiOptions, filter } from "../../utils";

class SelectWidget extends React.Component {

	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
		this._context = getContext(this.props.formContext.contextId);
	}

	componentDidMount() {
		this.mounted = true;
		this.props.formContext.services.focus.addFocusHandler(this.props.id, this.onFocus);
	}

	componentWillUnmount() {
		this.mounted = false;
		this.props.formContext.services.focus.removeFocusHandler(this.props.id, this.onFocus);
	}

	UNSAFE_componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getEnumOptions(props) {
		return getUiOptions(props.uiSchema).enumOptions || props.options.enumOptions;
	}

	getStateFromProps(props) {
		let {multiple, value} = props;
		let enumOptions = this.getEnumOptions(props);

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

		const {filter: _filter, filterType, labels, order} = getUiOptions(props);

		if (_filter) {
			enumOptions = filter(enumOptions, _filter, filterType, item => item.value);
		}

		if (labels) {
			enumOptions = enumOptions.map(({value, label}) => {
				return {value, label: value in labels ? labels[value] : label};
			});
		}

		if (enumOptions.every(({value: _value}) => value !== _value)) {
			const _enum = this.getEnumOptions(props).find(({value: _value}) => value === _value);
			if (_enum) {
				enumOptions.push(_enum);
			}
		}

		if (order) enumOptions = sort(enumOptions, order);

		const valsToItems = enumOptions.reduce((map, item) => {
			map[item.value] = item;
			return map;
		}, {});

		return {
			valsToItems,
			enumOptions,
			value: multiple ? value : valsToItems[value]
		};
	}

	multiSelectOnChange = (values) => {
		const lengthBeforeFiltering = values.length;
		values = values.filter(v => v.value !== "");
		if (this.props.value.length === lengthBeforeFiltering) {
			return;
		}
		this.props.onChange(values.map(({value}) => this.getEnum(value)));
	}

	selectOnChange = (item) => {
		this.props.onChange(this.getEnum(item.value));
	}

	onClick = () => {
		!this.props.disabled && !this.props.readonly && this.setState({open: true});
	}

	onFocus = () => this.setState({open: true});

	onBlur = () => this.setState({open: false});

	onSelect = (item) => {
		this.state.open && this.props.formContext.setTimeout(() => this.mounted && this.setState({open: false, value: item.value}));
		const value = this.getEnum(item.value);
		(!this.state.value || value !== this.state.value.value) && this.props.onChange(value);
	}

	// Quelch a warning from react-widgets with noop handler.
	onToggle = () => {}

	onKeyDown = (e) => {
		if (e.key !== "Tab") {
			return;
		}

		const item = this.elemRef.state.focusedItem;
		item && this.elemRef.handleSelect(item, e);
	}

	setRef = elem => {
		this.elemRef = elem;
	}

	getEnum = val => isEmptyString(val) ? undefined : val;

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
			disabled: disabled || readonly,
			filter: "contains",
			messages: {
				open: formContext.translations.Open,
				emptyList: formContext.translations.NoResults,
				emptyFilter: formContext.translations.NoResults
			},
			onFocus: this.onFocus,
			onBlur: this.onBlur,
			onToggle: this.onToggle,
			open: this.state.open,
			onKeyDown: this.onKeyDown
		};

		const selectComponent = multiple ? (
			<Multiselect 
				{...commonOptions}
				onChange={this.multiSelectOnChange}
				ref={this.setRef}
			/>
		) : (
			<Combobox
				{...commonOptions}
				onChange={this.selectOnChange}
				ref={this.setRef}
				onClick={this.onClick}
				onSelect={this.onSelect}
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

SelectWidget.propTypes = {
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["string", "array"])
	}),
	id: PropTypes.string.isRequired,
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			enumOptions: PropTypes.array,
			order: PropTypes.array,
			filter: PropTypes.array,
			filterType: PropTypes.string,
			labels: PropTypes.object,
		})
	}),
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
	required: PropTypes.bool,
	multiple: PropTypes.bool,
	autofocus: PropTypes.bool,
	onChange: PropTypes.func,
};

export default SelectWidget;
