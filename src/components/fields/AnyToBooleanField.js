import { anyToBoolean } from "../widgets/AnyToBooleanWidget";
import PropTypes from "prop-types";

const _anyToBoolean = anyToBoolean(!"field");
_anyToBoolean.propTypes =  {
	uiSchema: PropTypes.shape({
		"ui:options": PropTypes.shape({
			trueValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
			falseValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
			allowUndefined: PropTypes.bool
		})
	}),
	schema: PropTypes.shape({
		type: PropTypes.oneOf(["array", "object"])
	}).isRequired,
	formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
};
export default _anyToBoolean;
