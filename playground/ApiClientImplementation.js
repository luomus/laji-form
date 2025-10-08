import fetch from "isomorphic-fetch";
import queryString from "querystring";

export default class ApiClient {
	constructor(baseUrl, accessToken, userToken) {
		this.BASE_URL =  baseUrl;
		this.accessToken = accessToken;
		this.userToken = userToken;
	}

	getHeaders() {
		return {
			Authorization: this.accessToken,
			"Person-Token": this.userToken
		};
	}

	fetch(path, query, options = {}) {
		options.headers = {
			...(options.headers || {}),
			...this.getHeaders()
		}
		return fetch(`${this.BASE_URL}${path}?${queryString.stringify(query)}`, options);
	}
}
