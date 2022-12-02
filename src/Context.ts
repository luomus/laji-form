let singletonContext: any = {};

/**
 * A singleton context container for accessing state between components. Should be used for vars that shouldn't affect React change detection, e.g. not suitable to be stored in React context or are updated mutably.
 *
 * Empty namespace "" is used for global vars.
 */
export default (nameSpace: number | string = "") => {
	if (!singletonContext[nameSpace]) singletonContext[nameSpace] = {};
	return singletonContext[nameSpace];
}

export function clear() {
	singletonContext = {};
}
