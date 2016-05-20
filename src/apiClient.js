import fetch from "isomorphic-fetch";
import promise from "es6-promise";
import queryString from "querystring"
import merge from 'deepmerge';

let singletonInstance = null;

export default class ApiClient {
	constructor(baseUrl, accessToken, userToken, lang = "en") {
		if (!singletonInstance) { singletonInstance = this };
		this.BASE_URL =  baseUrl;
		this.lang = lang;
		this.baseQuery = {access_token: accessToken, user_token: userToken, lang: this.lang};

		return singletonInstance;
	}

	fetch(path, query, onSuccess, onError) {
		const queryObject = (typeof query == "object") ? merge(this.baseQuery, query) : this.baseQuery;
		return fetch(this.BASE_URL + path + "?" + queryString.stringify(queryObject)).then((response) => {
			if (response.status >= 400)
				throw new Error("Request failed");
			return response.json();
		});
	}
}
