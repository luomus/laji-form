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
import Popover from "react-bootstrap-2/Popover";
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
import Pagination from "react-bootstrap-2/Pagination";
import Accordion from "react-bootstrap-2/Accordion";
import Dropdown from "react-bootstrap-2/Dropdown";
import Form from "react-bootstrap-2/Form";
import ToggleButton from "react-bootstrap-2/ToggleButton";
import ToggleButtonGroup from "react-bootstrap-2/ToggleButtonGroup";
import { ButtonVariant } from "react-bootstrap-2/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { mapping as iconMapping } from "./glyphicon-fa-mapping";
import {
	Theme,
	ButtonProps,
	OverlayTriggerProps,
	Modal as ModalI,
	InputGroup as InputGroupI,
	Dropdown as DropdownI,
	PanelProps,
	Panel as PanelI,
	GlyphiconProps,
	ListGroupProps,
	ButtonVariant as ButtonVariantI,
	ColProps,
	FormControlProps,
	ToggleButtonGroupProps
} from "./theme";

const mapBtnVariant = (variant?: ButtonVariantI): ButtonVariant => {
	if (!variant) {
		variant = "default";
	}
	return variant === "default" ? "secondary" : variant;
};

const _Card = React.forwardRef<typeof Card, PanelProps>(({variant, ...props}, ref) => (
	<Card {...props} bg={variant} ref={ref as any}/>
));
const _CardHeader = (props: any) => <CardHeader className={"panel-heading"} {...props}/>;
let Panel = _Card as unknown as PanelI;
Panel.Body = Card.Body;
Panel.Heading = _CardHeader;
Panel.Collapse = ({children, ...props}) => (
	<Collapse {...props}><div>{children}</div></Collapse> // animations don't work if children are not wrapped to div
);

const Glyphicon: React.ComponentType<GlyphiconProps> = ({glyph, ...props}) => (
	<FontAwesomeIcon icon={iconMapping[glyph]} {...props} />
);

const _Modal: ModalI = Modal as unknown as ModalI;
_Modal.Body = Modal.Body;
_Modal.Header = Modal.Header;
_Modal.Footer = Modal.Footer;
_Modal.Title = Modal.Title;

const _InputGroup: InputGroupI = InputGroup as unknown as InputGroupI;
_InputGroup.Addon = InputGroup.Text;
_InputGroup.Button = (props) => <Button variant={"outline-secondary"} {...props}/>;

const _Dropdown: DropdownI = Dropdown as unknown as DropdownI;
_Dropdown.Menu = Dropdown.Menu;

const theme: Theme = {
	Panel,
	Table,
	ProgressBar,
	Button: React.forwardRef<typeof Button, ButtonProps>(({variant, small, ...props}, ref) => <Button {...props} variant={mapBtnVariant(variant)} size={small ? "sm" : undefined} ref={ref as any}/>),
	ButtonGroup,
	ButtonToolbar,
	Overlay: (props) => <Overlay {...props as any}/>,
	OverlayTrigger: React.forwardRef<typeof OverlayTrigger, OverlayTriggerProps>((props, ref) => <OverlayTrigger {...props as any}/>),
	Popover,
	Tooltip,
	Glyphicon,
	Modal: _Modal,
	Row: (props) => <Row {...props}/>,
	Col: React.forwardRef<typeof Col, ColProps>((props, ref) => <Col {...props} ref={ref}/>),
	FormGroup,
	InputGroup: _InputGroup,
	FormControl: React.forwardRef<typeof FormControl, FormControlProps>((props, ref) => <FormControl {...props as any} ref={ref} />),
	ListGroup: React.forwardRef<typeof ListGroup, ListGroupProps>((props, ref) => <ListGroup variant={"flush"} {...props} ref={ref as any}/>),
	ListGroupItem: ({onClick, ...props}) => <ListGroupItem action={!!onClick} onClick={onClick} {...props} />,
	Breadcrumb,
	HelpBlock: (props) => <Form.Text {...props} />,
	MenuItem: Dropdown.Item,
	Alert: (props) => <Alert {...props as any}/>,
	Pager: Pagination,
	Accordion: (props) => <Accordion {...props as any} />,
	Collapse,
	Dropdown: _Dropdown,
	Form,
	ControlLabel: Form.Label,
	Checkbox: Form.Check,
	ToggleButton,
	ToggleButtonGroup: React.forwardRef<typeof ToggleButtonGroup, ToggleButtonGroupProps>((props, ref) => <ToggleButtonGroup {...props as any} ref={ref} />)
};
export default theme;
