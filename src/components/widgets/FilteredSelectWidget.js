import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SelectWidget from "react-jsonschema-form/lib/components/widgets/SelectWidget";

export default class FilteredSelectWidget extends Component {
	static propTypes = {
		options: PropTypes.shape({
			type: PropTypes.oneOf(["blacklist", "whitelist"]).isRequired,
			filter: PropTypes.arrayOf(PropTypes.string).isRequired
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		const {options} = props;
		const {filter} = options;
		let propEnumOptions = options.enumOptions;

		const filterEnumsToIdxs = {};
		filter.forEach((_enum, i) => { filterEnumsToIdxs[_enum] = i });
		let enumOptions = undefined;
		if (options.type === "blacklist") {
			enumOptions = propEnumOptions.filter(enumOption => !filterEnumsToIdxs.hasOwnProperty(enumOption.value));
		} else if (options.type === "whitelist") {
			enumOptions = propEnumOptions.filter(enumOption => filterEnumsToIdxs.hasOwnProperty(enumOption.value));
		} else throw new Error("FilteredSelectWidget's type must be either 'blacklist' or 'whitelist'");
		return {options: {enumOptions}};
	}

	render() {
		return <SelectWidget {...this.props} {...this.state} />;
	}

}
