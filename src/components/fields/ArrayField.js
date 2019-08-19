import React, { Component } from "react";
import ArrayField from "react-jsonschema-form/lib/components/fields/ArrayField";
import { getDefaultFormState } from  "react-jsonschema-form/lib/utils";
import update from "immutability-helper";
import merge from "deepmerge";
import { getUiOptions, addLajiFormIds, getAllLajiFormIdsDeeply } from "../../utils";
import BaseComponent from "../BaseComponent";
import { beforeAdd } from "../ArrayFieldTemplate";
import Context from "../../Context";

export const copyItemFunction = (that, copyItem) => (props, {type, filter}) => {
	const nestedFilters = filter;

	const {schema, registry} = that.props;
	const defaultItem = getDefaultFormState(schema.items, undefined, registry.definitions);

	const source = type === "blacklist" ? defaultItem : copyItem;

	const filtered = nestedFilters.reduce((target, filter) => {
		const splitted = filter.includes("/") ? filter.substring(1).split("/") : [filter];
		const splittedWithoutLast = splitted.slice(0);
		const last = splittedWithoutLast.pop();

		let hasValue = false;
		let nestedPointer = source;
		for (let path of splitted) {
			if (nestedPointer && path in nestedPointer) {
				nestedPointer = nestedPointer[path];
				hasValue = true;
			} else {
				hasValue = false;
				break;
			}
		}

		if (!hasValue) return target;

		let pointer = undefined;
		let value = source;
		const updateObject = splittedWithoutLast.reduce((updateObject, path) => {
			updateObject[path] = {};
			pointer = updateObject[path];
			value = value[path];
			return pointer;
		}, {});

		updateObject[last] = {$set: value[last]};

		return update(target, updateObject);
	}, type === "blacklist" ? copyItem : defaultItem);

	return filtered;
};

export function onArrayFieldChange(formData, props) {
	const rootTmpIdTree = new Context(props.formContext.contextId).formInstance.tmpIdTree;

	let tmpIdTree = rootTmpIdTree;
	const treePath = props.idSchema.$id.replace(/root|_[0-9]+|_/g, "_").split("_").filter(i => i);
	for (const k of treePath) {
		if (tmpIdTree[k]) {
			tmpIdTree = tmpIdTree[k];
		} else {
			tmpIdTree = undefined;
			break;
		}
	}

	const [withLajiFormIds, ids] = addLajiFormIds(formData, tmpIdTree, false);
	const oldIds = getAllLajiFormIdsDeeply(props.formData, tmpIdTree);

	Object.keys(oldIds).forEach(id => {
		if (!ids[id]) {
			new Context(props.formContext.contextId).removeSubmitHook(id);
		}
	});
	return withLajiFormIds;
}

@BaseComponent
export default class _ArrayField extends Component {

	onChange = (formData) => {
		this.props.onChange(onArrayFieldChange(formData, this.props));
	}

	render() {
		const {props} = this;
		let {schema} = props;
		if (props.uiSchema.items && props.uiSchema.items["ui:field"]) {
			schema = {...schema, uniqueItems: false};
		}

		return <ArrayField
			{...props}
			schema={schema}
			uiSchema={{
				...props.uiSchema, 
				"ui:options": {
					orderable: false, 
					...props.uiSchema["ui:options"], 
					buttonDefinitions: getUiOptions(props.uiSchema).buttonDefinitions
						? merge(this.buttonDefinitions, getUiOptions(props.uiSchema).buttonDefinitions)
						: this.buttonDefinitions
				}
			}}
			onChange={this.onChange}
		/>;
	}

	buttonDefinitions = {
		copy: {
			glyph: "duplicate",
			fn: () => (...params) => {
				beforeAdd(this.props);
				this.onChange([
					...this.props.formData,
					copyItemFunction(this, this.props.formData[this.props.formData.length  - 1])(...params)
				]);
			},
			rules: {
				minLength:  1,
				canAdd: true
			},
			changesFormData: true
		},
		addPredefined: {
			fn: () => (onClickProps, {default: _default}) => {
				beforeAdd(this.props);
				this.onChange([
					...this.props.formData,
					getDefaultFormState(this.props.schema.items, _default, this.props.registry.definitions)
				]);
			},
			rules: {
				canAdd: true
			},
		}
	}
}
