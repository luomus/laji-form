import * as React from "react";
import { Theme, PanelProps, ButtonProps, OverlayTriggerProps } from "./theme";

const Stub = ({children}: {children: React.ReactNode}) => {
	console.error("You should define a theme prop for LajiForm. Using stub theme, the form will render but many components won't work as expected and will result in many React warnings.");
	return <React.Fragment>{children}</React.Fragment>;
};

const DivStub = React.forwardRef<HTMLDivElement, any>((props: any, ref) => <Stub><div {...props} ref={ref} /></Stub>);

const theme: Theme = {
	Panel: React.forwardRef<HTMLDivElement, PanelProps>(({children, header}, ref) =>
		<Stub>
			<div ref={ref}>
				{header && <div>{header}</div>}
				{children}
			</div>
		</Stub>
	),
	Table: DivStub,
	ProgressBar: DivStub,
	Button: React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => <Stub><button {...props} ref={ref}/></Stub>),
	ButtonGroup: DivStub,
	Overlay: DivStub,
	OverlayTrigger: React.forwardRef<HTMLDivElement, OverlayTriggerProps>((props, ref) => <Stub><div {...props} ref={ref} /></Stub>),
	Popover: ({title, ...props}) => <Stub><div {...props} /></Stub>, // eslint-disable-line @typescript-eslint/no-unused-vars
	Tooltip: DivStub,
	Glyphicon: DivStub
};
export default theme;
