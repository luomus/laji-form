import * as React from "react";
import { Theme, PanelProps, ButtonProps, OverlayTriggerProps } from "./theme";

const Stub = ({children}: {children: React.ReactNode}) => {
	console.error("You should define a theme prop for LajiForm. Using stub theme, the form will render but many components won't work as expected and will result in many React warnings.");
	return <React.Fragment>{children}</React.Fragment>;
};

const theme: Theme = {
	Panel: React.forwardRef<HTMLDivElement, PanelProps>(({children, header}, ref) =>
		<Stub>
			<div ref={ref}>
				{header && <div>{header}</div>}
				{children}
			</div>
		</Stub>
	),
	Table: props => <Stub><div {...props} /></Stub>,
	ProgressBar: props => <Stub><div {...props} /></Stub>,
	Button: React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => <Stub><button {...props} ref={ref}/></Stub>),
	ButtonGroup: props => <div {...props}/>,
	Overlay: props => <div {...props} />,
	OverlayTrigger: React.forwardRef<HTMLDivElement, OverlayTriggerProps>((props, ref) => <Stub><div {...props} ref={ref} /></Stub>),
	Popover: props => <Stub><div {...props} /></Stub>,
	Tooltip: props => <Stub><div {...props} /></Stub>,
	Glyphicon: props => <Stub><div {...props} /></Stub>
};
export default theme;
