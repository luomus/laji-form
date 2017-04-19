let singletonContext = {};

/**
 * A singleton context container.
 */
export default class Context {
	constructor(nameSpace) {
		if (nameSpace === undefined) nameSpace = "";
		if (!singletonContext[nameSpace]) singletonContext[nameSpace] = {};
		return singletonContext[nameSpace];
	}

}

export function clear() {
	singletonContext = {};
}
