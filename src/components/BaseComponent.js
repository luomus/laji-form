import { getReactComponentName } from "../utils";

/**
 * A base component that unifies state management and some optimization.
 */
export default function BaseComponent(ComposedComponent) {
	return class BaseComponent extends ComposedComponent {

		static displayName = getReactComponentName(ComposedComponent);

		constructor(props) {
			super(props);
			this.onChange = this.onChange.bind(this);
			if (!this.state && this.getStateFromProps) this.state = this.getStateFromProps(props);
		}

		componentWillReceiveProps(props) {
			if (this.getStateFromProps) this.setState(this.getStateFromProps(props));
			if (super.componentWillReceiveProps) {
				super.componentWillReceiveProps(props);
			}
		}

		onChange(formData) {
			super.onChange ? super.onChange(formData) : this.props.onChange(formData);
		}
	};
}
