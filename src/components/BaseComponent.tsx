import { getReactComponentName } from "../utils";
import { FieldProps, WidgetProps } from "./LajiForm";

type Constructor<T> = new(...args: any[]) => T;

interface LajiFormComponentForBaseComponent<P, S> extends React.Component<P, S> {
	getStateFromProps?(props: P): S;
	UNSAFE_componentWillReceiveProps?(props: Readonly<P>, nextContext?: any): void;
}

export function BaseComponent<P extends FieldProps | WidgetProps, S, LFC extends Constructor<LajiFormComponentForBaseComponent<P, S>>>(ComposedComponent: LFC) {
	return class BaseComponent extends ComposedComponent {

		static displayName = getReactComponentName(ComposedComponent);

		constructor(...args: any[]) {
			const props: P = args[0];
			super(props);
			if (!this.state && this.getStateFromProps) this.state = this.getStateFromProps(props);
		}

		UNSAFE_componentWillReceiveProps(props: Readonly<P>, nextContext: any) {
			if (super.UNSAFE_componentWillReceiveProps) {
				super.UNSAFE_componentWillReceiveProps(props, nextContext);
			} else if (this.getStateFromProps) {
				const state = this.getStateFromProps(props);
				if (state) this.setState(state);
			}
		}
	} as any;
}

export default BaseComponent;
