
/**
 * ApiClient "interface". Wraps the given apiClient as a singleton object.
 * Given apiClient must implement fetch().
 */
export default class ApiClient {
	constructor(apiClient, lang = "en") {
		this.apiClient = apiClient;
		this.on = {};
		this.lang = lang;
		this.cache = {};
	}

	/**
	 * Implementing apiClient must return a promise that passes the raw response as 1st arg.
	 * @param path URL for GET.
	 * @param query Object, where keys are param names and values are param values.
	 * @returns a Promise.
	 */
	fetchRaw(path, query, options) {
		return this.apiClient.fetch(path, {lang: this.lang, ...(query || {})}, options);
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

		if (!this.cache[path])  this.cache[path] = {};
		this.cache[path][cacheQuery] = this.cache[path].hasOwnProperty(cacheQuery) ? this.cache[path][cacheQuery] : this.fetch(path, query, options);
		return this.cache[path][cacheQuery];
	}

	invalidateCachePath(path) {
		delete this.cache[path];
		if (this.on[path]) {
			this.on[path].forEach(callback => callback());
		}
	}

	//TODO on invalidation callbacks
	invalidateCachePathQuery(path, query) {
		if (this.cache[path]) delete this.cache[path][query];
	}

	flushCache = () => {
		this.cache = {};
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

	setLang(lang) {
		this.lang = lang;
		this.flushCache();
	}
}
