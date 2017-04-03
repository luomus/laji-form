import lajiValidate from "laji-validate";

export default (validators) => (data, errors) => {
	if (validators) {
		var result = lajiValidate(data, validators), k, l;
		var messages = [];
		for(k in result) {
			for (l in result[k]) {
				messages.push({
					property: "instance." + k,
					message: result[k][l]
				});
			}
		}
		return toErrorSchema(messages);
	} else {
		return errors;
	}
};


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
