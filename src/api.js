import http from "http";
import { _extend as extend } from "util";
import queryString from "querystring"

export default class Api {
	constructor(apiKey, lang = "en") {
		this.API_HOST =  "apitest.laji.fi";
		this.API_PATH =  "/v0/forms";
		this.requestBaseOptions = {
			host: this.API_HOST
		};
		this.lang = lang;
		this.baseQuery = {format: "schema", access_token: apiKey, lang: this.lang};
		if (apiKey === undefined) throw "api key param must be given!";
	}
	/**
	 * Creates a HTTP request to the API.
	 * @param method HTTP method to use
	 * @param path URI path (api base uri is prepended automatically)
	 * @param query Object containing query params (format param is automatic)
	 * @param onSuccess [optional] Function to call on success. Response data is given as 1st param.
	 * @param onError [optional] Function to call on error. Response data is given as 1st param.
	 */
	_apiRequest(method, path, query, onSuccess, onError) {
		/** Merges a and b without modifying them. **/
		function merge(a, b) {
			return Object.assign(JSON.parse(JSON.stringify(a)), b);
		}

		let queryObject = (typeof query == "object") ? merge(this.baseQuery, query) : this.baseQuery;
		console.log("[REQUEST] " + this.API_HOST + this.API_PATH + path + "?" + queryString.stringify(queryObject));

		if (path === undefined) path = "";

		let paramOptions = {method: method, path: this.API_PATH + path + "?" + queryString.stringify(queryObject)};
		let options = merge(this.requestBaseOptions, paramOptions);

		http.request(options, (response) => {
			let responseData = "";
			response.on("data", (data) => { responseData += data; });
			if (response.statusCode == 200 && typeof onSuccess == "function") {
				response.on("end", () => { onSuccess(JSON.parse(responseData)); });
			} else if (typeof onError == "function") {
				response.on("end", () => { onError(responseData); });
			}
		}).end();
	}

	_get(path, query, onSuccess, onError) {
		this._apiRequest("GET", path, query, onSuccess, onError);
	}

	getAllForms(callback) {
		this._get("", {format: "json"}, callback);
	}
	getForm(id, onSuccess, onError) {
		if (id === undefined) throw "id parameter is mandatory";
		this._get("/" + id, undefined, onSuccess, onError);
	}
}

//const API_HOST =  "apitest.laji.fi";
//const API_PATH =  "/v0/forms";
//
//let requestBaseOptions = {
//	host: API_HOST,
//};
//
//let baseQuery = {format: "schema"};
//
///**
// * Creates a HTTP request to the API.
// * @param method HTTP method to use
// * @param path URI path (api base uri is prepended automatically)
// * @param query Object containing query params (format param is automatic)
// * @param onSuccess [optional] Function to call on success. Response data is given as 1st param.
// * @param onError [optional] Function to call on error. Response data is given as 1st param.
// */
//function apiRequest(method, path, query, onSuccess, onError) {
//
//	/** Merges a and b without modifying them. **/
//	function merge(a, b) {
//		return extend(JSON.parse(JSON.stringify(a)), b);
//	}
//
//	let queryObject = (typeof query == "object") ? merge(baseQuery, query) : baseQuery;
//	console.log("[REQUEST] " + API_HOST + API_PATH + path + "?" + queryString.stringify(queryObject));
//
//	if (path === undefined) path = "";
//
//	let paramOptions = {method: method, path: API_PATH + path + "?" + queryString.stringify(queryObject)};
//	let options = merge(requestBaseOptions, paramOptions);
//
//	http.request(options, (response) => {
//		let responseData = "";
//		response.on("data", (data) => { responseData += data; });
//		if (response.statusCode == 200 && typeof onSuccess == "function") {
//			response.on("end", () => { onSuccess(JSON.parse(responseData)); });
//		} else if (typeof onError == "function") {
//			response.on("end", () => { onError(responseData); });
//		}
//	}).end();
//}
//
//function get(path, query, onSuccess, onError) {
//	apiRequest("GET", path, query, onSuccess, onError);
//}
//
//function getAllForms(callback) {
//	get("", {format: "json", lang: lang}, callback);
//}
//function getForm(id, onSuccess, onError) {
//	if (id === undefined) throw "id parameter is mandatory";
//	get("/" + id, {lang: lang}, onSuccess, onError);
//}
//
//module.exports = {
//	getAllForms: getAllForms,
//	getForm: getForm
//}
