import * as React from "react";
import * as _Panel from "react-bootstrap/lib/Panel";
import * as Table from "react-bootstrap/lib/Table";
import * as ProgressBar from "react-bootstrap/lib/ProgressBar";
import * as Button from "react-bootstrap/lib/Button";
import * as ButtonGroup from "react-bootstrap/lib/ButtonGroup";
import * as ButtonToolbar from "react-bootstrap/lib/ButtonToolbar";
import * as Overlay from "react-bootstrap/lib/Overlay";
import * as OverlayTrigger from "react-bootstrap/lib/OverlayTrigger";
import * as Popover from "react-bootstrap/lib/Popover";
import * as Tooltip from "react-bootstrap/lib/Tooltip";
import * as Glyphicon from "react-bootstrap/lib/Glyphicon";
import * as Modal from "react-bootstrap/lib/Modal";
import * as Row from "react-bootstrap/lib/Row";
import * as Col from "react-bootstrap/lib/Col";
import * as FormGroup from "react-bootstrap/lib/FormGroup";
import * as InputGroup from "react-bootstrap/lib/InputGroup";
import * as FormControl from "react-bootstrap/lib/FormControl";
import * as ListGroup from "react-bootstrap/lib/ListGroup";
import * as ListGroupItem from "react-bootstrap/lib/ListGroupItem";
import * as Breadcrumb from "react-bootstrap/lib/Breadcrumb";
import * as HelpBlock from "react-bootstrap/lib/HelpBlock";
import * as MenuItem from "react-bootstrap/lib/MenuItem";
import * as Alert from "react-bootstrap/lib/Alert";
import * as Pager from "react-bootstrap/lib/Pager";
import * as Accordion from "react-bootstrap/lib/Accordion";
import * as Collapse from "react-bootstrap/lib/Collapse";
import * as Dropdown from "react-bootstrap/lib/Dropdown";
import * as Form from "react-bootstrap/lib/Form";
import * as ControlLabel from "react-bootstrap/lib/ControlLabel";
import * as Checkbox from "react-bootstrap/lib/Checkbox";
import * as ToggleButton from "react-bootstrap/lib/ToggleButton";
import * as ToggleButtonGroup from "react-bootstrap/lib/ToggleButtonGroup";
import {
	Theme,
	PanelProps,
	ButtonProps,
	Panel as PanelI,
	Dropdown as DropdownI,
	DropdownProps,
	DropdownMenuProps,
	DropdownToggleProps,
	Breadcrumb as BreadcrumbI,
	OverlayTriggerProps
} from "./theme";

const Panel = React.forwardRef<_Panel, PanelProps>(({variant, ...props}, ref) => <_Panel {...props} bsStyle={variant} ref={ref}/>);
const __Panel: PanelI = (Panel as unknown as PanelI);
__Panel.Body = _Panel.Body;
__Panel.Heading = _Panel.Heading;
__Panel.Collapse = _Panel.Collapse;

// Wrapper needed or webpack will hang.
const _Dropdown = (props: DropdownProps) => <Dropdown {...props} />;
const __Dropdown = _Dropdown as DropdownI;
__Dropdown.Menu = React.forwardRef((props: DropdownMenuProps, ref) => <Dropdown.Menu {...props} ref={ref} />);
(__Dropdown.Menu as any).defaultProps = {bsRole: "menu"};
__Dropdown.Toggle = React.forwardRef(({variant, ...props}: DropdownToggleProps, ref) => <Dropdown.Toggle bsStyle={variant} {...props} ref={ref}/>);
__Dropdown.Toggle.defaultProps = {bsRole: "toggle"} as any;

const _Breadcrumb: BreadcrumbI = Breadcrumb as unknown as BreadcrumbI;
_Breadcrumb.Item = Breadcrumb.Item as any;

const theme: Theme = {
	Panel: __Panel,
	Table,
	ProgressBar,
	Button: React.forwardRef<Button, ButtonProps>(({variant, small, ...props}, ref) => <Button {...props} bsStyle={variant} bsSize={small ? "small" : undefined} ref={ref}/>),
	ButtonGroup,
	ButtonToolbar,
	Overlay,
	OverlayTrigger: React.forwardRef<OverlayTrigger, OverlayTriggerProps>(({show, ...props}, ref) => <OverlayTrigger {...props} ref={ref} />),
	Popover,
	Tooltip,
	Glyphicon,
	Modal,
	Row,
	Col,
	FormGroup,
	InputGroup,
	FormControl,
	ListGroup,
	ListGroupItem,
	Breadcrumb: _Breadcrumb,
	HelpBlock,
	MenuItem,
	Alert: ({variant, ...props}) => <Alert {...props} bsStyle={variant}/>,
	Pager,
	Accordion,
	Collapse,
	Dropdown: __Dropdown,
	Form,
	ControlLabel,
	Checkbox,
	ToggleButton,
	ToggleButtonGroup
};
export default theme;
