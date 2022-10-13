import * as React from "react";
import Card from "react-bootstrap-2/Card";
import CardHeader from "react-bootstrap-2/CardHeader";
import Collapse from "react-bootstrap-2/Collapse";
import Table from "react-bootstrap-2/Table";
import ProgressBar from "react-bootstrap-2/ProgressBar";
import Button from "react-bootstrap-2/Button";
import ButtonGroup from "react-bootstrap-2/ButtonGroup";
import ButtonToolbar from "react-bootstrap-2/ButtonToolbar";
import Overlay from "react-bootstrap-2/Overlay";
import OverlayTrigger from "react-bootstrap-2/OverlayTrigger";
import Tooltip from "react-bootstrap-2/Tooltip";
import Modal from "react-bootstrap-2/Modal";
import Row from "react-bootstrap-2/Row";
import Col from "react-bootstrap-2/Col";
import FormGroup from "react-bootstrap-2/FormGroup";
import InputGroup from "react-bootstrap-2/InputGroup";
import FormControl from "react-bootstrap-2/FormControl";
import ListGroup from "react-bootstrap-2/ListGroup";
import ListGroupItem from "react-bootstrap-2/ListGroupItem";
import Breadcrumb from "react-bootstrap-2/Breadcrumb";
import Alert from "react-bootstrap-2/Alert";
import Accordion from "react-bootstrap-2/Accordion";
import Dropdown from "react-bootstrap-2/Dropdown";
import Form from "react-bootstrap-2/Form";
import ToggleButton from "react-bootstrap-2/ToggleButton";
import ToggleButtonGroup from "react-bootstrap-2/ToggleButtonGroup";
import { ButtonVariant } from "react-bootstrap-2/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp, library } from "@fortawesome/fontawesome-svg-core";
import {
	faCheck,
	faRefresh,
	faTriangleExclamation,
	faPlus,
	faCamera,
	faHeadphones,
	faUser,
	faBolt,
	faBars,
	faChevronUp,
	faChevronDown,
	faArrowUpRightFromSquare
} from "@fortawesome/free-solid-svg-icons";
import {
	Theme,
	ButtonProps,
	OverlayTriggerProps,
	Modal as ModalI,
	InputGroup as InputGroupI,
	Breadcrumb as BreadcrumbI,
	Pager,
	Dropdown as DropdownI,
	CheckboxProps,
	PanelProps,
	Panel as PanelI,
	GlyphiconProps,
	Glyph,
	ListGroupProps,
	ButtonVariant as ButtonVariantI
} from "./theme";

library.add(faCheck);
library.add(faRefresh);
library.add(faTriangleExclamation);
library.add(faPlus);
library.add(faCamera);
library.add(faHeadphones);
library.add(faUser);
library.add(faBolt);
library.add(faBars);
library.add(faChevronUp);
library.add(faChevronDown);
library.add(faArrowUpRightFromSquare);

const iconMapping: Record<Glyph, IconProp> = {
	"ok": "check",
	"refresh": "refresh",
	"warning-sign": "triangle-exclamation",
	"plus": "plus",
	"camera": "camera",
	"headphones": "headphones",
	"user": "user",
	"flash": "bolt",
	"menu-hamburger": "bars",
	"chevron-up": "chevron-up",
	"chevron-down": "chevron-down",
	"new-window": "arrow-up-right-from-square"
};

const mapBtnVariant = (variant?: ButtonVariantI): ButtonVariant => {
	if (!variant) {
		variant = "default";
	}
	return variant === "default" ? "secondary" : variant;
};

const Stub = ({componentName, children}: {componentName: string, children: React.ReactNode}) => {
	console.error("Bs5 theme missing a component " + componentName);
	return <React.Fragment>{children}</React.Fragment>;
};

const DivStubFunc = (componentName: string) => {
	return React.forwardRef<HTMLDivElement, any>((props: any, ref) => (
		<Stub componentName={componentName}><div {...props} ref={ref} /></Stub>
	));
};

const _Card = React.forwardRef<typeof Card, PanelProps>(({variant, ...props}, ref) => (
	<Card {...props} bg={variant} ref={ref as any}/>
));
const _CardHeader = (props: any) => <CardHeader className={"panel-heading"} {...props}/>;
let Panel = (_Card as unknown as PanelI);
Panel.Body = Card.Body;
Panel.Heading = _CardHeader;
Panel.Collapse = ({children, ...props}) => (
	<Collapse {...props}><div>{children}</div></Collapse> // animations don't work if children are not wrapped to div
);

const Glyphicon: React.ComponentType<GlyphiconProps> = ({glyph, ...props}) => {
	const icon: IconProp = iconMapping[glyph as Glyph];
	if (!icon) {
		console.log("Bs5 theme missing a glyph " + glyph);
		return null;
	}
	return <FontAwesomeIcon icon={icon} {...props}/>;
};

const _Modal: ModalI = DivStubFunc("Modal") as unknown as ModalI;
_Modal.Body = DivStubFunc("ModalBody");
_Modal.Header = DivStubFunc("ModalHeader");
_Modal.Footer = DivStubFunc("ModalFooter");
_Modal.Title = DivStubFunc("ModalTitle");

const _InputGroup: InputGroupI = DivStubFunc("InputGroup") as unknown as InputGroupI;
_InputGroup.Addon = DivStubFunc("InputGroupAddon");

const _Breadcrumb: BreadcrumbI = DivStubFunc("Breadcrumb") as unknown as BreadcrumbI;
_Breadcrumb.Item = DivStubFunc("BreadcrumbItem");

const Pager: Pager = DivStubFunc("Pager") as unknown as Pager;

const _Dropdown: DropdownI = DivStubFunc("Dropdown") as unknown as DropdownI;
_Dropdown.Menu = DivStubFunc("DropdownMenu");

const theme: Theme = {
	Panel,
	Table,
	ProgressBar,
	Button: React.forwardRef<typeof Button, ButtonProps>(({variant, small, ...props}, ref) => <Button {...props} variant={mapBtnVariant(variant)} size={small ? "sm" : undefined} ref={ref as any}/>),
	ButtonGroup,
	ButtonToolbar,
	Overlay: (props) => <Overlay {...props as any}/>,
	OverlayTrigger: React.forwardRef<typeof OverlayTrigger, OverlayTriggerProps>((props, ref) => <OverlayTrigger {...props as any}/>),
	Popover: ({title, ...props}) => <Stub componentName={"Popover"}><div {...props} /></Stub>, // eslint-disable-line @typescript-eslint/no-unused-vars
	Tooltip,
	Glyphicon,
	Modal: _Modal, 
	Row: (props) => <Row {...props}/>,
	Col: (props) => <Col {...props}/>,
	FormGroup: DivStubFunc("FormGroup"), 
	InputGroup: _InputGroup, 
	FormControl: (props) => <FormControl {...props as any} />,
	ListGroup: React.forwardRef<typeof ListGroup, ListGroupProps>((props, ref) => <ListGroup variant={"flush"} {...props}/>),
	ListGroupItem: ({onClick, ...props}) => <ListGroupItem action={!!onClick} onClick={onClick} {...props} />,
	Breadcrumb: _Breadcrumb,
	HelpBlock: DivStubFunc("HelpBlock"), 
	MenuItem: DivStubFunc("MenuItem"), 
	Alert: DivStubFunc("Alert"), 
	Pager, 
	Accordion: DivStubFunc("Accordion"), 
	Collapse: DivStubFunc("Collapse"), 
	Dropdown: _Dropdown,
	Form: DivStubFunc("Form"), 
	ControlLabel: DivStubFunc("ControlLabel"), 
	Checkbox: (props: CheckboxProps) => <input type="checkbox" {...props} />, 
	ToggleButton: DivStubFunc("ToggleButton"), 
	ToggleButtonGroup: DivStubFunc("ToggleButtonGroup") 
};
export default theme;
