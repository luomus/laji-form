let singletonContext: any = {};

/**
 * A singleton context container.
 */
export default class Context {
	constructor(nameSpace: number | string = "") {
		if (!singletonContext[nameSpace]) singletonContext[nameSpace] = {};
		return singletonContext[nameSpace];
	}
}

export function clear() {
	singletonContext = {};
}
