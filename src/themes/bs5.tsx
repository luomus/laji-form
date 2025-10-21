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
	ToggleButtonGroup,
	PageItem
} from "react-bootstrap-5";
import { Variant, ButtonVariant } from "react-bootstrap-5/types";
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
	Pager as PagerI,
	PagerItemProps,
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
	DropdownToggleProps,
	FormGroupProps,
	ValidationState,
	ToggleButtonProps
} from "./theme";
import { classNames } from "../utils";

const mapAnyVariant = (variant?: VariantI | ButtonVariantI, defaultVariant: Variant | ButtonVariant = "outline-secondary"): Variant | ButtonVariant => {
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
const mapValidationStateToClass = (validationState?: ValidationState|null): string => {
	if (!validationState) {
		return "";
	}
	return "text-" + (validationState === "error" ? "danger" : validationState);
};

const _Card = React.forwardRef<HTMLDivElement, PanelProps>(({eventKey, ...props}, ref) => (
	<Card {...props} ref={ref} />
));
let Panel = _Card as unknown as PanelI;
Panel.Body = Card.Body;
Panel.Heading = React.forwardRef<typeof Card.Header, any>((props, ref) => (
	<Card.Header className={"panel-heading"} {...props} ref={ref} />
));
Panel.Collapse = React.forwardRef<typeof Collapse, any>(({children, ...props}, ref) => (
	<Collapse {...props} ref={ref}><div>{children}</div></Collapse> // animations don't work if children are not wrapped to div
));
Panel.Footer = Card.Footer;

const Glyphicon: React.ComponentType<GlyphiconProps> = React.forwardRef<SVGSVGElement, GlyphiconProps>(({glyph, ...props}, ref) => (
	<FontAwesomeIcon className={"glyphicon"} icon={iconMapping[glyph]} {...props} ref={ref} />
));

const _Modal: ModalI = Modal as unknown as ModalI;

const _InputGroup: InputGroupI = InputGroup as unknown as InputGroupI;
_InputGroup.Addon = InputGroup.Text;
_InputGroup.Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
	<span {...props} ref={ref} />
));

const _Dropdown: DropdownI = Dropdown as unknown as DropdownI;
_Dropdown.Menu = Dropdown.Menu;
_Dropdown.Toggle = React.forwardRef<HTMLButtonElement, DropdownToggleProps>(({variant, ...props}, ref) => (
	<Dropdown.Toggle variant={mapVariant(variant)} {...props} ref={ref} />
));

const _Popover = React.forwardRef<typeof Popover, any>(({children, ...props}, ref) => (
	<Popover {...props} ref={ref}>
		{props.title ? <Popover.Header>{props.title}</Popover.Header> : null}
		<Popover.Body>{children}</Popover.Body>
	</Popover>
));

const _Pager: PagerI = Pagination;
_Pager.Item = React.forwardRef<HTMLLIElement, PagerItemProps>(({previous, next, ...props}, ref) => (
	<PageItem {...props} ref={ref} />
));

const theme: Theme = {
	Panel,
	Table,
	ProgressBar,
	Button: React.forwardRef<HTMLButtonElement, ButtonProps>(({variant, small, ...props}, ref) => <Button {...props} variant={mapBtnVariant(variant)} size={small ? "sm" : undefined} ref={ref} />),
	ButtonGroup,
	ButtonToolbar,
	Overlay: React.forwardRef<typeof Overlay, OverlayProps>((props, ref) => <Overlay {...props as any} ref={ref} />),
	OverlayTrigger: (props) => <OverlayTrigger {...props as any} />,
	Popover: _Popover,
	Tooltip,
	Glyphicon,
	Modal: _Modal,
	Row: React.forwardRef<typeof Row, JSX.IntrinsicAttributes>((props, ref) => <Row {...props} ref={ref} />),
	Col: React.forwardRef<typeof Col, ColProps>((props, ref) => <Col {...props} ref={ref} />),
	FormGroup: React.forwardRef<typeof FormGroup, FormGroupProps>(({validationState, className, ...props}, ref) => <FormGroup {...props as any} className={classNames(className, mapValidationStateToClass(validationState))} ref={ref} />),
	InputGroup: _InputGroup,
	FormControl: React.forwardRef<typeof FormControl, FormControlProps>((props, ref) => <FormControl {...props as any} ref={ref} />),
	ListGroup: React.forwardRef<HTMLDivElement, ListGroupProps>((props, ref) => <ListGroup variant={"flush"} {...props} ref={ref} />),
	ListGroupItem: React.forwardRef<HTMLAnchorElement, ListGroupItemProps>(({onClick, ...props}, ref) => <ListGroupItem action={!!onClick} onClick={onClick} {...props} ref={ref} />),
	Breadcrumb,
	HelpBlock: React.forwardRef<HTMLElement, JSX.IntrinsicAttributes>((props, ref) => <Form.Text {...props} ref={ref} />),
	MenuItem: Dropdown.Item,
	Alert: React.forwardRef<HTMLDivElement, AlertProps>(({variant, ...props}, ref) => <Alert variant={mapVariant(variant)} {...props} ref={ref} />),
	Pager: _Pager,
	Accordion: React.forwardRef<typeof Accordion, AccordionProps>((props, ref) => <Accordion {...props as any} ref={ref} />),
	Collapse,
	Dropdown: _Dropdown,
	Form,
	ControlLabel: Form.Label,
	Checkbox: Form.Check,
	ToggleButton: React.forwardRef<typeof ToggleButton, ToggleButtonProps>((props, ref) => <ToggleButton variant={"outline-secondary"} {...props as any} ref={ref} />),
	ToggleButtonGroup: React.forwardRef<typeof ToggleButtonGroup, ToggleButtonGroupProps>((props, ref) => <ToggleButtonGroup {...props as any} ref={ref} />)
};
export default theme;
