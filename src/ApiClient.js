let singletonInstance = null;
let cache = {};

/**
 * ApiClient "interface". Wraps the given apiClient as a singleton object.
 * Implementing class must implement fetch().
 */
export default class ApiClient {
	constructor(apiClient) {
		if (!singletonInstance) singletonInstance = this;
		this.apiClient = apiClient;
		return singletonInstance;
	}

	/**
	 * Implementing apiClient must return a promise.
	 * @param path URL for GET.
	 * @param query Object, where keys are param names and values are param values.
	 * @returns a Promise.
	 */
	fetch(path, query, options) {
		if (!this.apiClient) throw new Error("You must pass an api client implementation to LajiForm!");
		return this.apiClient.fetch(path, query, options).then(response => {
			return response;
		});
	}

	fetchCached(path, query) {
		const cacheKey = path + JSON.stringify(query);
		cache[cacheKey] = cache.hasOwnProperty(cacheKey) ? cache[cacheKey] : this.fetch(path, query);
		return cache[cacheKey]
	}

	flushCache() {
		cache = {};
	}
}
