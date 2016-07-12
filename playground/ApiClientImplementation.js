import fetch from "isomorphic-fetch";
import queryString from "querystring"
import merge from 'deepmerge';

export default class ApiClient {
	constructor(baseUrl, accessToken, userToken, lang = "en") {
		this.BASE_URL =  baseUrl;
		this.lang = lang;
		this.baseQuery = {access_token: accessToken, userToken: userToken, lang: this.lang};
	}

	fetch(path, query) {
		const queryObject = (typeof query == "object") ? merge(this.baseQuery, query) : this.baseQuery;
		return fetch(this.BASE_URL + path + "?" + queryString.stringify(queryObject)).then((response) => {
			if (response.status >= 400)
				throw new Error("Request failed");
			return response.json();
		});
	}
}