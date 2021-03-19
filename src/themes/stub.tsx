import * as React from "react";
import { Theme, Panel, ButtonProps, OverlayTriggerProps, Modal, InputGroup, Breadcrumb, Pager } from "./theme";

const Stub = ({children}: {children: React.ReactNode}) => {
	console.error("You should define a theme prop for LajiForm. Using stub theme, the form will render but many components won't work as expected and will result in many React warnings.");
	return <React.Fragment>{children}</React.Fragment>;
};

const DivStub = React.forwardRef<HTMLDivElement, any>((props: any, ref) => <Stub><div {...props} ref={ref} /></Stub>);

const Panel: Panel = DivStub as unknown as Panel;
Panel.Body = DivStub;
Panel.Heading = DivStub;
Panel.Collapse = DivStub;

const Modal: Modal = DivStub as unknown as Modal;
Modal.Body = DivStub;
Modal.Header = DivStub;
Modal.Footer = DivStub;
Modal.Title = DivStub;

const InputGroup: InputGroup = DivStub as unknown as InputGroup;
InputGroup.Addon = DivStub;

const Breadcrumb: Breadcrumb = DivStub as unknown as Breadcrumb;
Breadcrumb.Item = DivStub;

const Pager: Pager = DivStub as unknown as Pager;
Breadcrumb.Item = DivStub;

const theme: Theme = {
	Panel,
	Table: DivStub,
	ProgressBar: DivStub,
	Button: React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => <Stub><button {...props} ref={ref}/></Stub>),
	ButtonGroup: DivStub,
	ButtonToolbar: DivStub,
	Overlay: DivStub,
	OverlayTrigger: React.forwardRef<HTMLDivElement, OverlayTriggerProps>((props, ref) => <Stub><div {...props} ref={ref} /></Stub>),
	Popover: ({title, ...props}) => <Stub><div {...props} /></Stub>, // eslint-disable-line @typescript-eslint/no-unused-vars
	Tooltip: DivStub,
	Glyphicon: DivStub,
	Modal,
	Row: DivStub,
	Col: DivStub,
	FormGroup: DivStub,
	InputGroup,
	FormControl: (props) => <input {...props} />,
	ListGroup: DivStub,
	ListGroupItem: DivStub,
	Breadcrumb: Breadcrumb,
	HelpBlock: DivStub,
	MenuItem: DivStub,
	Alert: DivStub,
	Pager
};
export default theme;
