import React, { Component, PropTypes } from "react";
import { getUiOptions, getInnerUiSchema } from "../../utils";

export default class FilteredEnumStringField extends Component {
	static propTypes = {
		uiSchema:PropTypes.shape({
			"ui:options": PropTypes.shape({
				type: PropTypes.oneOf(["blacklist", "whitelist"]).isRequired,
				filter: PropTypes.arrayOf(PropTypes.string).isRequired,
				uiSchema: PropTypes.object
			}).isRequired
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
		const {filter, type} = getUiOptions(props.uiSchema);
		const uiSchema = getInnerUiSchema(props.uiSchema);
		const {schema} = props;

		let enums = [];
		let enumNames = [];

		const filterEnumsDictionary = {};
		filter.forEach(_enum => { filterEnumsDictionary[_enum] = true });

		function filterEnums(rule) {
			schema.enum.forEach((_enum, i) => {
				if (rule(filterEnumsDictionary[_enum])) {
					enums.push(_enum);
					enumNames.push(schema.enumNames[i]);
				}
			});
		}

		if (type === "blacklist") {
			filterEnums(item => !item);
		} else if (type === "whitelist") {
			filterEnums(item => item);
		} else throw new Error("FilteredSelectWidget's type must be either 'blacklist' or 'whitelist'");
		return {schema: {...schema, enum: enums, enumNames}, uiSchema};
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return <SchemaField {...this.props} {...this.state} />;
	}

}
