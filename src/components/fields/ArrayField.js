import * as React from "react";
import * as merge from "deepmerge";
import { getUiOptions, addLajiFormIds, getAllLajiFormIdsDeeply, parseJSONPointer, schemaJSONPointer, updateFormDataWithJSONPointer, getDefaultFormState } from "../../utils";
import BaseComponent from "../BaseComponent";
import { beforeAdd } from "../templates/ArrayFieldTemplate";
import Context from "../../Context";
import ReactContext from "../../ReactContext";
import { getDefaultRegistry } from "@rjsf/core";

// Doesn't work with arrays properly since uses JSON Pointers but not JSON path.
// e.g. "copy all array item values expect these" is impossible.
export const copyItemFunction = (that, copyItem) => (props, {type, filter}) => {

	const {schema, registry, formContext} = that.props;
	const defaultItem = getDefaultFormState(schema.items, undefined);

	copyItem = formContext.utils.filterItemIdsDeeply(copyItem, that.props.idSchema.$id);

	const source = type === "blacklist" ? defaultItem : copyItem;

	const filtered = filter.sort().reverse().reduce((target, f) => {
		let sourceValue;
		try {
			sourceValue = parseJSONPointer(source, f);
		} catch (e) {
			const schema = schemaJSONPointer(schema.items, f);
			sourceValue = getDefaultFormState(schema, undefined);
		}
		return updateFormDataWithJSONPointer({schema: schema.items, formData: target, registry}, sourceValue, f);
	}, type === "blacklist" ? copyItem : defaultItem);

	const tmpIdTree = that.props.formContext.utils.getRelativeTmpIdTree(props.idSchema.$id);
	return addLajiFormIds(filtered, tmpIdTree, false)[0];
};

export function onArrayFieldChange(formData, props) {
	const tmpIdTree = props.formContext.utils.getRelativeTmpIdTree(props.idSchema.$id);
	return addLajiFormIds(formData, tmpIdTree, false)[0];
}

const {ArrayField} = getDefaultRegistry().fields;

export class ArrayFieldPatched extends ArrayField {
	constructor(...params) {
		super(...params);
		const {_getNewFormDataRow} = this;
		this._getNewFormDataRow = () => {
			const tmpIdTree = this.props.formContext.utils.getRelativeTmpIdTree(this.props.idSchema.$id);
			const [item] = addLajiFormIds(_getNewFormDataRow.call(this), tmpIdTree, false);
			return item;
		};

		const {onDropIndexClick} = this;
		this.onDropIndexClick = (index) => (event) => {
			const item = this.props.formData[index];
			const tmpIdTree = this.props.formContext.utils.getRelativeTmpIdTree(`${this.props.idSchema.$id}_${index}`);
			const oldIds = getAllLajiFormIdsDeeply(item, tmpIdTree);

			Object.keys(oldIds).forEach((id) => {
				return new Context(this.props.formContext.contextId).removeSubmitHook(id);
			}, []);
			onDropIndexClick.call(this, index)(event);
		};
	}

	renderArrayFieldItem(props) {
		// rjsf@5 started rendering array items with titles as "name-idx" - we don't want that.
		if (typeof props.name === "string") {
			props.name = undefined;
		}

		if (this.props.idSchema) {
			const idSchema = this.getIdSchema(this.props, props.index);
			return super.renderArrayFieldItem({...props, itemIdSchema: idSchema});
		}
		return super.renderArrayFieldItem(props);
	}

	getIdSchema(props, _index) {
		const {idSchema, uiSchema} = props;
		const {idxOffsets = {}} = getUiOptions(uiSchema);
		const index = (idxOffsets[_index] || 0) + _index;

		const root = idSchema.$id;
		const reduced = (idSchema, root) => Object.keys(idSchema).reduce((idSchema, prop) => {
			if (prop === "$id") {
				return {
					...idSchema,
					"$id": idSchema.$id.replace(root, `${root}_${index}`)
				};
			}
			return {...idSchema, [prop]: reduced(idSchema[prop], root)};
		}, idSchema);
		return reduced(idSchema, root);
	}
}

@BaseComponent
export default class _ArrayField extends React.Component {
	static contextType = ReactContext;

	onChange = (formData) => {
		this.props.onChange(onArrayFieldChange(formData, this.props));
	}

	render() {
		const {props} = this;
		let {schema} = props;
		if (props.uiSchema.items && props.uiSchema.items["ui:field"]) {
			schema = {...schema, uniqueItems: false};
		}

		// MultiArrayField needs to intercept default ArrayField internals, the instance is passed in formContext.
		const {ArrayField: _ArrayField} = props.formContext;
		const Component = _ArrayField || ArrayFieldPatched;

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
					getDefaultFormState(this.props.schema.items, _default)
				]);
			},
			rules: {
				canAdd: true
			},
			changesFormData: true
		}
	}
}
