import { PropTypes } from "react";
import { shouldRender } from "react-jsonschema-form/lib/utils";
import { getReactComponentName, getContext } from "../utils";

/**
 * A base component that unifies state management and some optimization.
 */
export default function BaseComponent(ComposedComponent) {
	return class BaseComponent extends ComposedComponent {

		static displayName = getReactComponentName(ComposedComponent);

		static contextTypes = {
			root: PropTypes.object,
		}

		constructor(props, context) {
			super(props, context);
			this.onChange = this.onChange.bind(this);
			if (!this.state && this.getStateFromProps) this.state = this.getStateFromProps(props);
		}

		componentWillReceiveProps(props) {
			if (this.getStateFromProps) this.setState(this.getStateFromProps(props));
			if (super.componentWillReceiveProps) {
				super.componentWillReceiveProps(props);
			}
		}

		shouldComponentUpdate(nextProps, nextState) {
			return shouldRender(this, nextProps, nextState);
		}

		onChange(formData, force) {
			super.onChange ? super.onChange(formData, force) : this.props.onChange(formData, force);
		}

		getContext(name) {
			return getContext(this.context, name);
		}
	};
}
