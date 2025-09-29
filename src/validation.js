import * as lajiValidate from "@luomus/laji-validate";

export function initializeValidation(apiClient) {
	lajiValidate.extend(lajiValidate.validators.remote, {
		fetch: (...params) => apiClient.apiClient.fetch(...params)
	});
}

export default ({errors: error, warnings: warning}, data) => {
	const promises = [];

	const getPromiseForValidator = (type, validator) => {
		return lajiValidate.async(data, validator)
			.then(() => {})
			.catch(res => res)
			.then(err => {return {type, err};});
	};

	const _validators = {error, warning};

	Object.keys(_validators).forEach(type => {
		const validator = _validators[type];
		promises.push(getPromiseForValidator(type, validator));
	});

	return Promise.all(promises).then((res) => {
		const messages = res.reduce((arr, {type, err}) => {
			arr = arr.concat(getMessages(err, type));
			return arr;
		}, []);
		return Promise.resolve(toErrorSchema(messages));
	});
};

export function transformErrors(translations, errors) {
	return errors.map(error => {
		if (error.name === "type") {
			error.message = translations.TypeError + translations[error.params.type] + ".";
		} else if (error.name === "required") {
			error.message = translations.FieldIsRequired + ".";
		} else if (error.name === "uniqueItems") {
			error.message = translations.UniqueItems + ".";
		}
		return error;
	});
}

function getMessages(result, type) {
	const messages = [];
	for (let k in result) {
		for (let l in result[k]) {
			const message = (type !== "validators") ? `[${type}]` + result[k][l] : result[k][l];
			messages.push({
				property: "instance." + k,
				message: message
			});
		}
	}
	return messages;
}


// these are taken from @rjsf/core to convert error messages to wanted form
// see https://github.com/mozilla-services/@rjsf/core/blob/master/src/validate.js
export function toErrorSchema(errors) {
	// Transforms a jsonschema validation errors list:
	// [
	//   {property: "instance.level1.level2[2].level3", message: "err a"},
	//   {property: "instance.level1.level2[2].level3", message: "err b"},
	//   {property: "instance.level1.level2[4].level3", message: "err b"},
	// ]
	// Into an error tree:
	// {
	//   level1: {
	//     level2: {
	//       2: {level3: {errors: ["err a", "err b"]}},
	//       4: {level3: {errors: ["err b"]}},
	//     }
	//   }
	// };
	if (!errors.length) {
		return {};
	}
	return errors.reduce(function (errorSchema, error) {
		var property = error.property;
		var message = error.message;

		var path = errorPropertyToPath(property);
		var parent = errorSchema;
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = path.slice(1)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var segment = _step.value;

				if (!(segment in parent)) {
					parent[segment] = {};
				}
				parent = parent[segment];
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}

		if (Array.isArray(parent.__errors)) {
			// We store the list of errors for this node in a property named __errors
			// to avoid name collision with a possible sub schema field named
			// "errors" (see `validate.createErrorHandler`).
			parent.__errors = parent.__errors.concat(message);
		} else {
			parent.__errors = [message];
		}
		return errorSchema;
	}, {});
}

const RE_ERROR_ARRAY_PATH = /\[\d+]/g;

function errorPropertyToPath(property) {
	// Parse array indices, eg. "instance.level1.level2[2].level3"
	// => ["instance", "level1", "level2", 2, "level3"]
	return property.split(".").reduce(function (path, node) {
		var match = node.match(RE_ERROR_ARRAY_PATH);
		if (match) {
			var nodeName = node.slice(0, node.indexOf("["));
			var indices = match.map(function (str) {
				return parseInt(str.slice(1, -1), 10);
			});
			path = path.concat(nodeName, indices);
		} else {
			path.push(node);
		}
		return path;
	}, []);
}
