import lajiValidate from "laji-validate";

export default (validators) => (data, errors) => {

	if (validators) {
		const result = lajiValidate(data, validators);
		const messages = getMessages(result);
		return toErrorSchema(messages);
	}

	return errors;
};

export function getWarnings(data, id, validators, schema) {
	if (!id || !validators) return [];

	function getValidator(idArray, i, validators, schema) {
		if (i >= idArray.length) {
			let validator = null;
			for (const prop in validators) {
				if (!schema[prop]) {
					if (!validator) validator = {};
					validator[prop] = validators[prop];
				}
			}
			return validator;
		}

		for (const prop in validators) {
			if (prop.match(/^\d+$/)) {
				return getValidator(idArray, i + 1, validators.items, schema.items);
			}
			if (prop === idArray[i]) {
				validators = validators[prop];
				schema = schema[prop];
				if (validators.properties) {
					validators = validators.properties;
					schema = schema.properties;
				}
				return getValidator(idArray, i + 1, validators, schema);
			}
		}

		return null;
	}

	const idParts = id.split("_");
	const validator = getValidator(idParts, 1, validators, schema.properties);
	if (validator) {
		const id = idParts[idParts.length - 1];
		const result = lajiValidate({[id]: data}, {[id]: validator});
		if (result) {
			return result[id];
		}
	}

	return [];
}

function getMessages(result) {
	const messages = [];
	for(let k in result) {
		for (let l in result[k]) {
			messages.push({
				property: "instance." + k,
				message: result[k][l]
			});
		}
	}
	return messages;
}


// these are taken from react-jsonschema-form to convert error messages to wanted form
// see https://github.com/mozilla-services/react-jsonschema-form/blob/master/src/validate.js
function toErrorSchema(errors) {
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
