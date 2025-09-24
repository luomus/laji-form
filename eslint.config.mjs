import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import stylistic from "@stylistic/eslint-plugin"

export default [
	{
		files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true
				},
				experimentalDecorators: true
			}
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			react: reactPlugin,
			"react-hooks": reactHooksPlugin,
			"@stylistic": stylistic
		},
		rules: {
			"@stylistic/indent": ["error", "tab", {
				// Allow alignment with spaces *after* initial tab indent
				SwitchCase: 0,
				ignoredNodes: [
					"JSXElement *",
					"JSXElement",
					"JSXAttribute",
					"JSXSpreadAttribute",
					"JSXIdentifier",
					"JSXNamespacedName",
					"JSXMemberExpression",
					"JSXOpeningElement",
					"JSXClosingElement",
					"JSXFragment",
					"JSXOpeningFragment",
					"JSXClosingFragment",
					"JSXText",
					"JSXEmptyExpression",
					"JSXSpreadChild"
				],
			}],
			"linebreak-style": ["error", "unix"],
			quotes: ["error", "double"],
			semi: ["error", "always"],
			"react/prop-types": "off",
			"react/display-name": "off",
			"no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
			"no-unsafe-finally": "off",
			"no-constant-condition": ["error", { checkLoops: false }],
			"react/no-find-dom-node": "off",
			"react/jsx-no-bind": 2,
			"no-console": "off",
			"keyword-spacing": 1,
			"prefer-const": "off",
			"react/no-deprecated": "off",
			"react/no-string-refs": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-var-requires": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-this-alias": "off",
			"@typescript-eslint/no-non-null-assertion": "off"
		}
	}
];
