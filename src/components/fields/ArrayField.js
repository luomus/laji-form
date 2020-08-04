import React, { Component } from "react";
import ArrayField from "@rjsf/core/dist/cjs/components/fields/ArrayField";
import { getDefaultFormState } from  "@rjsf/core/dist/cjs/utils";
import merge from "deepmerge";
import { getUiOptions, addLajiFormIds, getAllLajiFormIdsDeeply, getRelativeTmpIdTree, parseJSONPointer, schemaJSONPointer, updateFormDataWithJSONPointer, filterItemIdsDeeply } from "../../utils";
import BaseComponent from "../BaseComponent";
import { beforeAdd } from "../ArrayFieldTemplate";
import Context from "../../Context";

// Doesn't work with arrays properly since uses JSON Pointers but not JSON path.
// e.g. "copy all array item values expect these" is impossible.
export const copyItemFunction = (that, copyItem) => (props, {type, filter}) => {

	const {schema, registry, formContext} = that.props;
	const defaultItem = getDefaultFormState(schema.items, undefined, registry.definitions);

	copyItem = filterItemIdsDeeply(copyItem, formContext.contextId, that.props.idSchema.$id);

	const source = type === "blacklist" ? defaultItem : copyItem;

	const filtered = filter.sort().reverse().reduce((target, f) => {
		let sourceValue;
		try {
			sourceValue = parseJSONPointer(source, f);
		} catch (e) {
			const schema = schemaJSONPointer(schema.items, f);
			sourceValue = getDefaultFormState(schema, undefined, registry.definitions);
		}
		return updateFormDataWithJSONPointer({schema: schema.items, formData: target, registry}, sourceValue, f);
	}, type === "blacklist" ? copyItem : defaultItem);

	return filtered;
};

export function onArrayFieldChange(formData, props) {
	const tmpIdTree = getRelativeTmpIdTree(props.formContext.contextId, props.idSchema.$id);

	const [withLajiFormIds, ids] = addLajiFormIds(formData, tmpIdTree, false);
	const oldIds = getAllLajiFormIdsDeeply(props.formData, tmpIdTree);

	const promises = Object.keys(oldIds).reduce((promises, id) => {
		if (!ids[id]) {
			promises.push(new Context(props.formContext.contextId).removeSubmitHook(id));
		}
		return promises;
	}, []);
	return Promise.all(promises).then(() => withLajiFormIds);
}

export class ArrayFieldAddPatched extends ArrayField {
	constructor(...params) {
		super(...params);
		const {_getNewFormDataRow} = this;
		this._getNewFormDataRow = () => {
			const tmpIdTree = getRelativeTmpIdTree(this.props.formContext.contextId, this.props.idSchema.$id);
			const [item] = addLajiFormIds(_getNewFormDataRow.call(this), tmpIdTree, false);
			return item;
		};
	}
}

@BaseComponent
export default class _ArrayField extends Component {

	onChange = (formData) => {
		onArrayFieldChange(formData, this.props).then(this.props.onChange);
	}

	render() {
		const {props} = this;
		let {schema} = props;
		if (props.uiSchema.items && props.uiSchema.items["ui:field"]) {
			schema = {...schema, uniqueItems: false};
		}

		// MultiArrayField needs to intercept default ArrayField internals, the instance is passed in formContext.
		const {ArrayField: _ArrayField} = props.formContext;
		const Component = _ArrayField || ArrayFieldAddPatched;

		// Reset formContext.ArrayField
		const formContext = _ArrayField ? {...props.formContext, ArrayField: undefined} : props.formContext;
		const registry = _ArrayField ? {...props.registry, formContext} : props.registry;

		return <Component
			{...props}
			formContext={formContext}
			registry={registry}
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
					...(this.props.formData || []),
					getDefaultFormState(this.props.schema.items, _default, this.props.registry.definitions)
				]);
			},
			rules: {
				canAdd: true
			},
			changesFormData: true
		}
	}
}
