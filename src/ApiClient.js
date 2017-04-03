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
	 * Implementing apiClient must return a promise that passes the raw response as 1st arg.
	 * @param path URL for GET.
	 * @param query Object, where keys are param names and values are param values.
	 * @returns a Promise.
	 */
	fetchRaw(path, query, options) {
		return this.apiClient.fetch(path, query, options);
	}

	fetch(path, query, options) {
		return this.fetchRaw(path, query, options).then(response => {
			if (response.status >= 400) {
				throw new Error("Request failed");
			}
			return response.json();
		});
	}

	fetchCached(path, query) {
		const cacheKey = path + JSON.stringify(query);
		cache[cacheKey] = cache.hasOwnProperty(cacheKey) ? cache[cacheKey] : this.fetch(path, query);
		return cache[cacheKey];
	}


	flushCache() {
		cache = {};
	}
}
