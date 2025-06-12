import { RJSFSchema } from "@rjsf/utils";
import { addLajiFormIds, getAllLajiFormIdsDeeply, removeLajiFormIds, isObject } from "../utils";

export default class IdService {
	private tmpIdTree: any
	private formData: any;

	constructor(schema: RJSFSchema, formData: any) {
		this.tmpIdTree = createTmpIdTree(schema);
		this.formData = formData;
	}

	setSchema(schema: RJSFSchema) {
		this.tmpIdTree = createTmpIdTree(schema);
	}

	setFormData(formData: any) {
		this.formData = formData;
	}

	addLajiFormIds(formData: any, immutably = true) {
		return addLajiFormIds(formData, this.tmpIdTree, immutably);
	}

	getAllLajiFormIdsDeeply(formData: any) {
		return getAllLajiFormIdsDeeply(formData, this.tmpIdTree);
	}

	removeLajiFormIds(formData: any) {
		return removeLajiFormIds(formData, this.tmpIdTree);
	}

	getUUID = (item: any) => item ? (item.id || item._lajiFormId) : undefined;

	findPointerForLajiFormId(tmpIdTree: any = {}, formData: any, lajiFormId: string | number): string | undefined {
		if (tmpIdTree._hasId) {
			if (Array.isArray(formData)) {
				for (let idx in (formData || [])) {
					const item = formData[idx];
					if (this.getUUID(item) === lajiFormId) {
						return "/" + idx;
					}
				}
			} else if (formData && this.getUUID(formData) === lajiFormId) {
				return "";
			}
		}
		for (const k of Object.keys(tmpIdTree)) {
			if (isObject(formData[k])) {
				const find = this.findPointerForLajiFormId(tmpIdTree[k], formData[k], lajiFormId);
				if (find !== undefined || find === "") {
					return `/${k}${find}`;
				}
			} else if (Array.isArray(formData[k])) {
				for (const i in formData[k]) {
					const item = formData[k][i];
					const find = this.findPointerForLajiFormId(tmpIdTree[k], item, lajiFormId);
					if (find !== undefined || find === "") {
						return `/${k}/${i}${find}`;
					}
				}
			}
		}
		return undefined;
	}

	getJSONPointerFromLajiFormIdAndRelativePointer(lajiFormId: string | number, relativePointer: string) {
		const containerPointer = this.findPointerForLajiFormId(this.tmpIdTree, this.formData, lajiFormId);
		if (!containerPointer) {
			return "";
		}
		return containerPointer + relativePointer;
	}

	getJSONPointerFromLajiFormIdAndFormDataAndIdSchemaId(idSchemaId: string, lajiFormId: string | number) {
		const relativePointer = this.getRelativePointer(idSchemaId, lajiFormId);
		return this.getJSONPointerFromLajiFormIdAndRelativePointer(lajiFormId, relativePointer || "");
	}

	getRelativePointer(idSchemaId: string, lajiFormId: string | number) {
		const containerPointer = this.findPointerForLajiFormId(this.tmpIdTree, this.formData, lajiFormId);
		if (!containerPointer) {
			return "";
		}
		const indicesCount = containerPointer.match(/\/[0-9]+/g)?.length || 0;
		const containerPointerWithoutArrayIndices = containerPointer.replace(/[0-9]+/g, "");
		const thisPointer = idSchemaId.replace("root", "").replace(/_/g, "/");
		let thisPointerWithoutContainerIndices = thisPointer;
		for (let i = indicesCount; i > 0; i--) {
			thisPointerWithoutContainerIndices = thisPointerWithoutContainerIndices.replace(/[0-9]+/, "");
		}
		return thisPointerWithoutContainerIndices.replace(containerPointerWithoutArrayIndices, "");
	}

	getRelativeTmpIdTree(id: string) {
		let tmpIdTree = this.tmpIdTree;
		if (!tmpIdTree) {
			return undefined;
		}
		const treePath = id.replace(/root|_[0-9]+|_/g, "_").split("_").filter(i => i);
		for (const k of treePath) {
			if (tmpIdTree[k]) {
				tmpIdTree = tmpIdTree[k];
			} else {
				tmpIdTree = undefined;
				break;
			}
		}
		return tmpIdTree;
	}
}

export function createTmpIdTree(schema: RJSFSchema) {
	function walk(_schema: any) {
		if (_schema.properties) {
			const _walked = Object.keys(_schema.properties).reduce((paths, key) => {
				const walked = walk(_schema.properties[key]);
				if (walked) {
					(paths as any)[key] = walked;
				}
				return paths;
			}, {});
			if (Object.keys(_walked).length) return _walked;
		} else if (_schema.type === "array" && _schema.items.type === "object") {
			return Object.keys(_schema.items.properties).reduce((paths, key) => {
				const walked = walk(_schema.items.properties[key]);
				if (walked) {
					(paths as any)[key] = walked;
				}
				return paths;
			}, {_hasId: true});
		}
		return undefined;
	}
	return walk(schema);
}

