import * as React from "react";
import ReactContext from "../../ReactContext";
import { OverlayTriggerProps } from "../../themes/theme";
import { FormContext } from "../LajiForm";

type IsHoverableProps = {
	hoverable: true;
	formContext: FormContext;
}

type IsNotHoverableProps = {
	hoverable?: false;
	formContext?: FormContext;
}

type Props = OverlayTriggerProps & (IsHoverableProps | IsNotHoverableProps) & {
	style?: React.CSSProperties;
};
type State = {
	hoveringElem?: boolean
	hoveringOverlay?: boolean;
}

/**
 * OverlayTrigger that is hoverable if `hoverable: true`
 *
 * If you pass `hoverable: true`, you must also pass `formContext`.
 */
export class OverlayTrigger extends React.Component<Props, State> {
	static contextType = ReactContext;

	overlayTimeout?: ReturnType<FormContext["setTimeout"]>;
	popoverMouseIn?: boolean;

	constructor(props: Props) {
		super(props);
		this.state = {};
	}

	componentWillUnmount() {
		if (this.overlayTimeout) {
			clearTimeout(this.overlayTimeout);
		}
	}

	overlayTriggerMouseOver = () => {
		this.setState({hoveringElem: true});
	};

	overlayTriggerMouseOut = () => {
		if (this.overlayTimeout) {
			clearTimeout(this.overlayTimeout);
		}
		if (this.props.hoverable) {
			this.overlayTimeout = this.props.formContext.setTimeout(() => {
				if (!this.popoverMouseIn) {
					this.setState({hoveringElem: false});
				}
			}, 200);
		} else { 
			this.setState({hoveringElem: false});
		}
	};

	overlayMouseOver = () => {
		this.setState({hoveringOverlay: true});
	};

	overlayMouseOut = () => {
		this.setState({hoveringOverlay: false, hoveringElem: false});
	};

	render() {
		const {
			children,
			overlay,
			style,
			...props
		} = this.props;

		const {OverlayTrigger} = this.context.theme;

		let _overlay = React.cloneElement(overlay, {onMouseOver: this.overlayMouseOver, onMouseOut: this.overlayMouseOut});

		const show = this.props.show !== undefined
			? this.props.show
			: this.state.hoveringElem || this.props.hoverable && this.state.hoveringOverlay;

		return (
			<div onMouseOver={this.overlayTriggerMouseOver} onMouseOut={this.overlayTriggerMouseOut} style={style}>
				<OverlayTrigger
					{...props}
					delay={1}
					trigger={[]}
					placement={this.props.placement || "top"}
					overlay={_overlay}
					show={show}
				>
					{children}
				</OverlayTrigger>
			</div>
		);
	}
}

