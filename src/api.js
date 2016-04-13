'use strict';

let http = require("http");
let extend = require("util")._extend;
let queryString = require("querystring");

const API_HOST =  "form.laji.fi";
const API_PATH =  "/lajiform";

let requestBaseOptions = {
	host: API_HOST,
};

let baseQuery = {format: "schema"};

/**
 * Creates a HTTP request to the API.
 * @param method HTTP method to use
 * @param path URI path (api base uri is prepended automatically)
 * @param query Object containing query params (format param is automatic)
 * @param onSuccess [optional] Function to call on success. Response data is given as 1st param.
 * @param onError [optional] Function to call on error. Response data is given as 1st param.
 */
function apiRequest(method, path, query, onSuccess, onError) {

	/** Merges a and b without modifying them. **/
	function merge(a, b) {
		return extend(JSON.parse(JSON.stringify(a)), b);
	}

	let queryObject = (typeof query == "object") ? merge(baseQuery, query) : baseQuery;
	console.log("[REQUEST] " + API_HOST + API_PATH + path + "?" + queryString.stringify(queryObject));

	if (path === undefined) path = "";

	let paramOptions = {method: method, path: API_PATH + path + "?" + queryString.stringify(queryObject)};
	let options = merge(requestBaseOptions, paramOptions);

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

function get(path, query, onSuccess, onError) {
	apiRequest("GET", path, query, onSuccess, onError);
}

function getAllForms(callback) {
	get("", {format: "json"}, callback);
}
function getForm(id, onSuccess, onError) {
	if (id === undefined) throw "id parameter is mandatory";
	get("/" + id, undefined, onSuccess, onError);
}

module.exports = {
	getAllForms: getAllForms,
	getForm: getForm
}
