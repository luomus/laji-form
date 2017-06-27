import React, { Component } from "react";
import PropTypes from "prop-types";
import { getUiOptions, getInnerUiSchema, isEmptyString, focusNextInput } from "../../utils";
import BaseComponent from "../BaseComponent";

/**
 * Constructs selects from given tree.
 * uiSchema = {"ui:options": {
*   tree: {<enum key tree>}, (node object: {children: {key: {<node>}, key2:{<node>}}, order: ["key", "key2"]} (order is optional)
*   labels: [<string>]
 * }
 */
@BaseComponent
export default class TreeField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				tree: PropTypes.object.isRequired,
				labels: PropTypes.arrayOf(PropTypes.string),
				uiSchema: PropTypes.object
			}).isRequired
		}).isRequired
	}

	getStateFromProps(props) {
		let schema = {"type": "object"};
		let {uiSchema} = props;
		uiSchema = getInnerUiSchema(props.uiSchema);
		let formData = {};
		let idSchema = {$id: props.idSchema.$id};

		let dictionarifiedEnums = {};
		props.schema.enum.forEach((e, i) => {
			dictionarifiedEnums[e] = props.schema.enumNames[i];
		});

		let {tree, labels} = getUiOptions(props.uiSchema);

		let levels = [];
		let parentsMap = {};
		let childrenMap = {};
		let orderMap = {};
		function getLevels(tree, depth, root) {
			childrenMap[root] = {};
			if (tree.children) Object.keys(tree.children).forEach(key => {
				if (!levels[depth]) levels[depth] = {};
				levels[depth][key] = true;
				parentsMap[key] = root;
				childrenMap[root][key] = true;
				getLevels(tree.children[key], depth + 1, key);
			});
			if (tree.order) orderMap[root] = tree.order;
		}
		getLevels(tree, 0);

		let properties = {};
		function addSelect(depth, key, childrenKeys) {
			let select = {"type": "string", "enum": [""], enumNames: [""]};

			let order = orderMap[key];
			if (order) childrenKeys.sort((a, b) => {return order.indexOf(a) - order.indexOf(b);});

			childrenKeys.forEach(key => {
				select.enum.push(key);
				select.enumNames.push(dictionarifiedEnums[key]);
			});
			select.title = (labels && labels[depth]) ? labels[depth] : "";

			properties[depth] = select;
			idSchema[depth] = {$id: idSchema.$id + "_" + depth};
		}

		let searchTerm = props.formData;

		let depth = 0;
		if (!isEmptyString(searchTerm)) for (let i in levels) {
			let level = levels[i];
			if (level[searchTerm]) break;
			depth++;
		}

		let n = searchTerm;
		let d = depth;
		while (d >= 0) {
			formData[d] = n;
			if (isEmptyString(n)) n = undefined; //object keys can't be "", so root key is in childrenMap 'undefined'.
			addSelect(d, n, Object.keys(childrenMap[parentsMap[n]]));
			d--;
			n = parentsMap[n];
		}

		if (!isEmptyString(searchTerm) && childrenMap[searchTerm] && Object.keys(childrenMap[searchTerm]).length) {
			addSelect(depth + 1, searchTerm, Object.keys(childrenMap[searchTerm]));
			formData[depth + 1] = undefined;
		}

		schema.properties = properties;

		return {schema, formData, uiSchema, idSchema};
	}

	onChange(formData) {
		let selectNames = Object.keys(formData).sort((a, b) => {return b - a;});

		for (let i in selectNames) {
			if (formData[i] !== this.state.formData[i]) {
				let value;
				if (isEmptyString(formData[i])) {
					value = (i > 0) ? formData[i - 1] : undefined;
				} else {
					value = formData[i];
				}
				this.props.onChange(value);
				break;
			}
		}
	}

	onKeyDown = (e) => {
		if (e.key == "Enter" && !e.ctrlKey) {
			e.preventDefault();
			e.stopPropagation();
			this.getContext().setImmediate(() => {
				focusNextInput(this.props.formContext.getFormRef(), document.activeElement, e.shiftKey);
			});
		}
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		return (<div onKeyDown={this.onKeyDown}><SchemaField
			{...this.props}
			{...this.state}
			onChange={this.onChange}
		/></div>);
	}
}
