import { Component } from "react";
import PropTypes from "prop-types";
import { parseJSONPointer, getUpdateObjectFromJSONPath, updateSafelyWithJSONPath } from  "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Enables leaking any prop to any other prop container.
 *
 * uiSchema = {"ui:options": {
 *	props: [
 *		string | {
 *			from: If a regular string, a property to copy from formData. If a JSON pointer, the root will be this.props.
 *			target: Target where to copy the 'from'. If a regular string, it will be copied to /uischema/ui:options. If a JSON pointer, the root will be this.props.
 *		}
 */
@VirtualSchemaField
export default class DataLeakerField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				props: PropTypes.arrayOf(PropTypes.oneOfType([
					PropTypes.string,
					PropTypes.shape({
						from: PropTypes.string.isRequired,
						target: PropTypes.string
					})
				]))
			}),
			uiSchema: PropTypes.object
		}).isRequired
	}

	static getName() {return "DataLeakerField";}

	getStateFromProps(props) {
		return (this.getUiOptions(props.uiSchema).props || []).reduce((props, strOrObjProp) => {
			const [fromPath, targetPath] = ["from", "target"].map(p => typeof strOrObjProp === "string"
				? strOrObjProp
				: strOrObjProp[p]
			);
			const from = targetPath[0] === "/"
				? parseJSONPointer(props, fromPath)
				: parseJSONPointer(props.formData, fromPath);

			const _targetPath = targetPath[0] === "/"
				? targetPath
				: `/uiSchema/ui:options/${targetPath}`;

			props = updateSafelyWithJSONPath(props, from, _targetPath);
			return props;
		}, props);
	}
}
