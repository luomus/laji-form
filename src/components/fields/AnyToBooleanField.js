import * as React from "react";
import { AnyToBoolean } from "../widgets/AnyToBooleanWidget";
import * as PropTypes from "prop-types";

const _anyToBoolean = (props) => <AnyToBoolean {...props} />;
_anyToBoolean.propTypes =  {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			trueValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
			falseValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
			allowUndefined: PropTypes.bool
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["array", "object"])
	}).isRequired,
	formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
};
export default _anyToBoolean;
