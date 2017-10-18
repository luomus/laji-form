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
		this.on = {};
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
		const cacheQuery = JSON.stringify(query);

		if (!cache[path])  cache[path] = {};
		cache[path][cacheQuery] = cache[path].hasOwnProperty(cacheQuery) ? cache[path][cacheQuery] : this.fetch(path, query);
		return cache[path][cacheQuery];
	}

	invalidateCachePath(path) {
		delete cache[path];
		if (this.on[path]) {
			this.on[path].forEach(callback => callback());
		}
	}

	//TODO on invalidation callbacks
	invalidateCachePathQuery(path, query) {
		if (cache[path]) delete cache[path][query];
	}

	flushCache() {
		cache = {};
	}

	onCachePathInvalidation(path, callback) {
		if (!this.on[path]) this.on[path] = [];

		this.on[path].push(callback);
	}

	onRemoveCachePathInvalidation(path, callback) {
		if (this.on[path]) {
			this.on[path] = this.on[path].filter(fn => fn !== callback);
		}
	}
}
