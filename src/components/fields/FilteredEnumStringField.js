import React, { Component, PropTypes } from "react";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class FilteredEnumStringField extends Component {
	static propTypes = {
		uiSchema:PropTypes.shape({
			"ui:options": PropTypes.shape({
				type: PropTypes.oneOf(["blacklist", "whitelist"]).isRequired,
				filter: PropTypes.arrayOf(PropTypes.string).isRequired
			}).isRequired,
			uiSchema: PropTypes.object
		}).isRequired
	}

	getStateFromProps(props) {
		const {schema} = props;
		const {filter, type} = this.getUiOptions();

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
		return {schema: {...schema, enum: enums, enumNames}};
	}
}
