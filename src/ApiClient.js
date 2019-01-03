let singletonInstance = null;
let cache = {};

let lang = "en";

/**
 * ApiClient "interface". Wraps the given apiClient as a singleton object.
 * Given apiClient must implement fetch().
 */
export default class ApiClient {
	constructor(apiClient, _lang) {
		if (!singletonInstance) singletonInstance = this;
		this.apiClient = apiClient;
		this.on = {};
		if (_lang) {
			lang = _lang;
		}
		return singletonInstance;
	}

	/**
	 * Implementing apiClient must return a promise that passes the raw response as 1st arg.
	 * @param path URL for GET.
	 * @param query Object, where keys are param names and values are param values.
	 * @returns a Promise.
	 */
	fetchRaw(path, query, options) {
		return this.apiClient.fetch(path, {lang, ...(query || {})}, options);
	}

	fetch(path, query, options = {}) {
		const {failSilently = false, ...fetchOptions} = options;
		return this.fetchRaw(path, query, fetchOptions).then(response => {
			if (!failSilently && response.status >= 400) {
				throw new Error("Request failed");
			}
			return response.json();
		});
	}

	fetchCached(path, query, options) {
		const cacheQuery = JSON.stringify(query) + JSON.stringify(options);

		if (!cache[path])  cache[path] = {};
		cache[path][cacheQuery] = cache[path].hasOwnProperty(cacheQuery) ? cache[path][cacheQuery] : this.fetch(path, query, options);
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

	removeOnCachePathInvalidation(path, callback) {
		if (this.on[path]) {
			this.on[path] = this.on[path].filter(fn => fn !== callback);
		}
	}

	setLang (_lang) {
		lang = _lang;
		this.flushCache();
	}
}
