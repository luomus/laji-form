import * as React from "react";
import * as PropTypes from "prop-types";
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
export default class DataLeakerField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				props: PropTypes.arrayOf(
					PropTypes.shape({
						from: PropTypes.string.isRequired,
						fromArrayKey: PropTypes.string,
						target: PropTypes.string,
						joinArray: PropTypes.bool
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
			const [fromPath, fromArrayKey, targetPath, joinArray] = ["from", "fromArrayKey", "target", "joinArray"]
				.map(p => strOrObjProp[p]);
			let from = fromPath[0] === "/"
				? parseJSONPointer(props, fromPath)
				: parseJSONPointer(props.formData, fromPath);

			if (fromArrayKey) {
				from = (from || []).map(obj => obj[fromArrayKey]);
			}
			if (joinArray && Array.isArray(from)) {
				from = from.join(",");
			}

			const _targetPath = targetPath[0] === "/"
				? targetPath
				: `/uiSchema/ui:options/${targetPath}`;
			props = updateSafelyWithJSONPointer(props, from, _targetPath);
			return props;
		}, props);
	}
}
