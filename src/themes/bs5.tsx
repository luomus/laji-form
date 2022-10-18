import * as React from "react";
import {
	Card,
	Collapse,
	Table,
	ProgressBar,
	Button,
	ButtonGroup,
	ButtonToolbar,
	Overlay,
	OverlayTrigger,
	Popover,
	Tooltip,
	Modal,
	Row,
	Col,
	FormGroup,
	InputGroup,
	FormControl,
	ListGroup,
	ListGroupItem,
	Breadcrumb,
	Alert,
	Pagination,
	Accordion,
	Dropdown,
	Form,
	ToggleButton,
	ToggleButtonGroup
} from "react-bootstrap-2";
import { Variant, ButtonVariant } from "react-bootstrap-2/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { mapping as iconMapping } from "./glyphicon-fa-mapping";
import {
	Theme,
	ButtonProps,
	Modal as ModalI,
	InputGroup as InputGroupI,
	Dropdown as DropdownI,
	PanelProps,
	Panel as PanelI,
	GlyphiconProps,
	ListGroupProps,
	Variant as VariantI,
	ButtonVariant as ButtonVariantI,
	ColProps,
	FormControlProps,
	ToggleButtonGroupProps,
	OverlayProps,
	ListGroupItemProps,
	AlertProps,
	AccordionProps,
	DropdownToggleProps
} from "./theme";

const mapAnyVariant = (variant?: VariantI | ButtonVariantI, defaultVariant: Variant | ButtonVariant = "secondary"): Variant | ButtonVariant => {
	if (!variant || variant === "default") {
		return defaultVariant;
	}
	return variant;
};
const mapVariant = (variant?: VariantI, defaultVariant?: Variant): Variant => {
	return mapAnyVariant(variant, defaultVariant);
};
const mapBtnVariant = (variant?: ButtonVariantI, defaultVariant?: ButtonVariant): ButtonVariant => {
	return mapAnyVariant(variant, defaultVariant);
};

const _Card = React.forwardRef<typeof Card, PanelProps>(({variant, ...props}, ref) => (
	<Card {...props} bg={mapVariant(variant, "")} ref={ref as any} />
));
let Panel = _Card as unknown as PanelI;
Panel.Body = Card.Body;
Panel.Heading = React.forwardRef<typeof Panel.Heading, any>((props, ref) => (
	<Card.Header className={"panel-heading"} {...props} ref={ref} />
));
Panel.Collapse = React.forwardRef<typeof Collapse, any>(({children, ...props}, ref) => (
	<Collapse {...props} ref={ref}><div>{children}</div></Collapse> // animations don't work if children are not wrapped to div
));

const Glyphicon: React.ComponentType<GlyphiconProps> = React.forwardRef<typeof FontAwesomeIcon, GlyphiconProps>(({glyph, ...props}, ref) => (
	<FontAwesomeIcon icon={iconMapping[glyph]} {...props} ref={ref as any} />
));

const _Modal: ModalI = Modal as unknown as ModalI;
_Modal.Body = Modal.Body;
_Modal.Header = Modal.Header;
_Modal.Footer = Modal.Footer;
_Modal.Title = Modal.Title;

const _InputGroup: InputGroupI = InputGroup as unknown as InputGroupI;
_InputGroup.Addon = InputGroup.Text;
_InputGroup.Button = React.forwardRef<typeof Button , ButtonProps>((props, ref) => (
	<Button variant={"outline-secondary"} {...props} ref={ref as any} />
));

const _Dropdown: DropdownI = Dropdown as unknown as DropdownI;
_Dropdown.Menu = Dropdown.Menu;
_Dropdown.Toggle = React.forwardRef<typeof Dropdown.Toggle, DropdownToggleProps>(({variant, ...props}, ref) => (
	<Dropdown.Toggle variant={mapVariant(variant)} {...props} ref={ref as any} />
));

const theme: Theme = {
	Panel,
	Table,
	ProgressBar,
	Button: React.forwardRef<typeof Button, ButtonProps>(({variant, small, ...props}, ref) => <Button {...props} variant={mapBtnVariant(variant)} size={small ? "sm" : undefined} ref={ref as any} />),
	ButtonGroup,
	ButtonToolbar,
	Overlay: React.forwardRef<typeof Overlay, OverlayProps>((props, ref) => <Overlay {...props as any} ref={ref} />),
	OverlayTrigger: (props) => <OverlayTrigger {...props as any} />,
	Popover,
	Tooltip,
	Glyphicon,
	Modal: _Modal,
	Row: React.forwardRef<typeof Row, JSX.IntrinsicAttributes>((props, ref) => <Row {...props} ref={ref} />),
	Col: React.forwardRef<typeof Col, ColProps>((props, ref) => <Col {...props} ref={ref} />),
	FormGroup,
	InputGroup: _InputGroup,
	FormControl: React.forwardRef<typeof FormControl, FormControlProps>((props, ref) => <FormControl {...props as any} ref={ref} />),
	ListGroup: React.forwardRef<typeof ListGroup, ListGroupProps>((props, ref) => <ListGroup variant={"flush"} {...props} ref={ref as any} />),
	ListGroupItem: React.forwardRef<typeof ListGroupItem, ListGroupItemProps>(({onClick, ...props}, ref) => <ListGroupItem action={!!onClick} onClick={onClick} {...props} ref={ref as any} />),
	Breadcrumb,
	HelpBlock: React.forwardRef<typeof Form.Text, JSX.IntrinsicAttributes>((props, ref) => <Form.Text {...props as any} ref={ref} />),
	MenuItem: Dropdown.Item,
	Alert: React.forwardRef<typeof Alert, AlertProps>(({variant, ...props}, ref) => <Alert variant={mapVariant(variant)} {...props as any} ref={ref} />),
	Pager: Pagination,
	Accordion: React.forwardRef<typeof Accordion, AccordionProps>((props, ref) => <Accordion {...props as any} ref={ref} />),
	Collapse,
	Dropdown: _Dropdown,
	Form,
	ControlLabel: Form.Label,
	Checkbox: Form.Check,
	ToggleButton,
	ToggleButtonGroup: React.forwardRef<typeof ToggleButtonGroup, ToggleButtonGroupProps>((props, ref) => <ToggleButtonGroup {...props as any} ref={ref} />)
};
export default theme;
