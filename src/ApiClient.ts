import { Translations } from "./components/LajiForm";
import { Lang } from "./types";

interface Query {
	[param: string]: any;
}

interface Options {
	failSilently?: boolean;
	[option: string]: any;
}

export interface ApiClientImplementation {
	fetch: (path: string, query: Query, options: any) => Promise<any>;
}

/**
 * ApiClient "interface". Wraps the given apiClient as a singleton object.
 * Given apiClient must implement fetch().
 */
export default class ApiClient {
	apiClient: ApiClientImplementation;
	lang: Lang;
	translations: Translations;
	cache: {[path: string]: {[cacheKey: string]: Promise<any>}} = {};
	on: {[path: string]: (() => void)[]} = {};

	constructor(apiClient: ApiClientImplementation, lang: Lang = "en", translations: Translations) {
		this.apiClient = apiClient;
		this.lang = lang;
		this.translations = translations;
	}

	/**
	 * Implementing apiClient must return a promise that passes the raw response as 1st arg.
	 * @param path URL for GET.
	 * @param query Object, where keys are param names and values are param values.
	 * @returns a Promise.
	 */
	fetchRaw(path: string, query?: Query, options?: any) {
		const _query = {lang: this.lang, ...(query || {})};
		if (!_query.lang) {
			delete (_query as any).lang;
		}
		return this.apiClient.fetch(path, _query, options).catch(() => {
			throw new Error(this.translations[this.lang].RequestFailed as string);
		});
	}

	fetch<T>(path: string, query?: Query, options: Options = {}): Promise<T> {
		const {failSilently = false, ...fetchOptions} = options;
		return this.fetchRaw(path, query, fetchOptions).then(response => {
			if (!failSilently && response.status >= 400) {
				throw new Error("Request failed");
			}
			if (response.status === 204) {
				return undefined as unknown as T;
			}
			return response.json() as T;
		}).catch(() => {
			if (this.cache[path]) delete this.cache[path][this.getCacheKey(query, options)];
			throw new Error(this.translations[this.lang].RequestFailed as string);
		});
	}

	getCacheKey(query?: Query, options?: Options) {
		return JSON.stringify(query) + JSON.stringify(options);
	}

	fetchCached<T>(path: string, query?: Query, options?: Options): Promise<T> {
		const cacheKey = this.getCacheKey(query, options);
		if (!this.cache[path])  this.cache[path] = {};
		this.cache[path][cacheKey] = cacheKey in this.cache[path] ? this.cache[path][cacheKey] : this.fetch<T>(path, query, options);
		return this.cache[path][cacheKey];
	}

	invalidateCachePath(path: string) {
		delete this.cache[path];
		if (this.on[path]) {
			this.on[path].forEach(callback => callback());
		}
	}

	//TODO on invalidation callbacks
	invalidateCachePathQuery(path: string, query: string) {
		if (this.cache[path]) delete this.cache[path][query];
	}

	flushCache = () => {
		this.cache = {};
	}

	onCachePathInvalidation(path: string, callback: () => void) {
		if (!this.on[path]) this.on[path] = [];

		this.on[path].push(callback);
	}

	removeOnCachePathInvalidation(path: string, callback: () => void) {
		if (this.on[path]) {
			this.on[path] = this.on[path].filter(fn => fn !== callback);
		}
	}

	setLang(lang: Lang) {
		this.lang = lang;
		this.flushCache();
	}
}
