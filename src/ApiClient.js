let singletonInstance = null;

/**
 * ApiClient "interface". Wraps the given apiClient as singleton object.
 * Implementing class must implement fetch().
 */
export default class ApiClient {
	constructor(apiClient) {
		if (!singletonInstance) { singletonInstance = this };
		this.apiClient = apiClient;
		return singletonInstance;
	}

	/**
	 * Implementing apiClient must return a promise.
	 * @param path URL for GET
	 * @param query Object, where keys are param names and values are param values.
	 * @param onSuccess Callback function for successful GET
	 * @param onError Callback function for failed GET
	 * @returns Promise
	 */
	fetch(path, query, onSuccess, onError) {
		if (!this.apiClient) throw new Error("You must pass an api client implementation to LajiForm!");
		return this.apiClient.fetch(path, query, onSuccess, onError);
	}
}
