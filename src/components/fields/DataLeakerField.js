import { Component } from "react";
import PropTypes from "prop-types";
import { parseJSONPointer, updateSafelyWithJSONPointer } from  "../../utils";
import VirtualSchemaField from "../VirtualSchemaField";

/**
 * Enables leaking any prop to any other prop container.
 *
 * uiSchema = {"ui:options": {
 *	props: [
 *		{
 *			from: If a regular string, a property to copy from formData. If a JSON pointer, the root will be this.props.
 *			target: Target where to copy the 'from'. If a regular string, it will be copied to /uischema/ui:options. If a JSON pointer, the root will be this.props.
 *		}
 */
@VirtualSchemaField
export default class DataLeakerField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				props: PropTypes.arrayOf(
					PropTypes.shape({
						from: PropTypes.string.isRequired,
						target: PropTypes.string
					})
				)
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array", "object"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
	}

	static getName() {return "DataLeakerField";}

	getStateFromProps(props) {
		const {props: _props = []} = this.getUiOptions(props.uiSchema);
		return (Array.isArray(_props) ? _props : [_props]).reduce((props, strOrObjProp) => {
			const [fromPath, targetPath] = ["from", "target"].map(p => strOrObjProp[p]);
			const from = fromPath[0] === "/"
				? parseJSONPointer(props, fromPath)
				: parseJSONPointer(props.formData, fromPath);

			const _targetPath = targetPath[0] === "/"
				? targetPath
				: `/uiSchema/ui:options/${targetPath}`;

			props = updateSafelyWithJSONPointer(props, from, _targetPath);
			return props;
		}, props);
	}
}
