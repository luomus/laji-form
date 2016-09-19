const singletonContext = {};

/**
 * A singleton context container.
 */
export default class Context {
	get(nameSpace) {
		if (!singletonContext[nameSpace]) singletonContext[nameSpace] = {};
		return singletonContext[nameSpace];
	}
}
