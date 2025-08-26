import * as React from "react";
import { getUiOptions, getInnerUiSchema, isEmptyString } from "../../utils";
import { FieldProps, JSONSchemaObject, JSONSchemaEnum } from "../../types";
import { useCallback } from "react";

/**
 * Constructs selects from given tree.
 * uiSchema = {"ui:options": {
*   tree: {<enum key tree>}, (node object: {children: {key: {<node>}, key2:{<node>}}, order: ["key", "key2"]} (order is optional)
*   labels: [<string>]
 * }
 */
export default function SelectTreeField(props: FieldProps<JSONSchemaEnum>) {
	const childProps = getChildProps(props);
	const { onChange: parentOnChange } = props;
	const { formData: childFormData } = childProps;

	const onChange = useCallback((formData) => {
		let selectNames = Object.keys(formData).sort((a, b) => {return +b - +a;});

		for (let i in selectNames) {
			if (formData[i] !== childFormData[i]) {
				let value;
				if (isEmptyString(formData[i])) {
					value = (+i > 0) ? formData[+i - 1] : undefined;
				} else {
					value = formData[i];
				}
				parentOnChange(value);
				break;
			}
		}
	}, [childFormData, parentOnChange]);

	const SchemaField = props.registry.fields.SchemaField as any;
	return <SchemaField
		{...props}
		{...childProps}
		onChange={onChange}
	/>;
}

type Tree = { children: Record<string, Tree | Record<string, never>>, order: string[] };

const getChildProps = (props: FieldProps<JSONSchemaEnum>): Pick<FieldProps<JSONSchemaObject>, "formData" | "idSchema" | "schema" | "uiSchema"> => {
	let schema = {"type": "object", title: props.schema.title} as JSONSchemaObject ;
	let formData: Record<string, string | undefined> = {};
	let idSchema = { $id: props.idSchema.$id } as FieldProps["idSchema"];

	let dictionarifiedEnums: Record<string, string> = {};
	props.schema.oneOf.forEach((e: any)=> {
		dictionarifiedEnums[e.const] = e.title;
	});

	const tree: Tree = getUiOptions(props.uiSchema).tree;

	let levels: Record<string, boolean>[] = [];
	let parentsMap: Record<string, string | undefined> = {};
	let childrenMap: Record<string, Record<string, boolean>> = {};
	let orderMap: Record<string, string[]> = {};
	function getLevels(tree: Tree | Record<string, never>, depth: number, root?: string) {
		childrenMap[root as any] = {};
		if (!tree.children) {
			return;
		}
		Object.keys(tree.children).forEach(key => {
			if (!levels[depth]) levels[depth] = {};
			levels[depth][key] = true;
			parentsMap[key] = root;
			childrenMap[root as any][key] = true;
			getLevels(tree.children[key], depth + 1, key);
		});
		orderMap[root as any] = tree.order;
	}
	getLevels(tree, 0);

	let properties: Record<string, JSONSchemaEnum> = {};
	function addSelect(depth: number, key: string | undefined, childrenKeys: string[]) {
		let select: JSONSchemaEnum = {type: "string", oneOf: [{const: "", title: ""}]};

		let order = orderMap[key as any];
		if (order) {
			childrenKeys.sort((a, b) => {return order.indexOf(a) - order.indexOf(b);});
		}

		childrenKeys.forEach(key => {
			select.oneOf.push({const: key, title: dictionarifiedEnums[key]});
		});
		select.title = "";

		properties[depth] = select;
		idSchema[depth] = {$id: idSchema.$id + "_" + depth} as FieldProps["idSchema"];
	}

	let searchTerm: string = props.formData;

	let depth = 0;
	if (!isEmptyString(searchTerm)) {
		for (const level of levels) {
			if (level[searchTerm]) break;
			depth++;
		}
	}

	let n: string | undefined = searchTerm;
	let d = depth;
	while (d >= 0) {
		formData[d] = n;
		if (isEmptyString(n)) {
			n = undefined; // object keys can't be "", so root key is in childrenMap 'undefined'.
		}
		addSelect(d, n, Object.keys(childrenMap[parentsMap[n as any] as any]));
		d--;
		n = parentsMap[n as any];
	}

	if (!isEmptyString(searchTerm) && childrenMap[searchTerm] && Object.keys(childrenMap[searchTerm]).length) {
		addSelect(depth + 1, searchTerm, Object.keys(childrenMap[searchTerm]));
		formData[depth + 1] = undefined;
	}

	schema.properties = properties;

	return {schema, formData, uiSchema: getInnerUiSchema(props.uiSchema), idSchema};
};
