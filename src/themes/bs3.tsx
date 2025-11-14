import * as React from "react";
import _Panel from "react-bootstrap/lib/Panel";
import Table from "react-bootstrap/lib/Table";
import ProgressBar from "react-bootstrap/lib/ProgressBar";
import Button from "react-bootstrap/lib/Button";
import ButtonGroup from "react-bootstrap/lib/ButtonGroup";
import ButtonToolbar from "react-bootstrap/lib/ButtonToolbar";
import Overlay from "react-bootstrap/lib/Overlay";
import _OverlayTrigger from "react-bootstrap/lib/OverlayTrigger";
import Popover from "react-bootstrap/lib/Popover";
import Tooltip from "react-bootstrap/lib/Tooltip";
import Glyphicon from "react-bootstrap/lib/Glyphicon";
import Modal from "react-bootstrap/lib/Modal";
import Row from "react-bootstrap/lib/Row";
import Col from "react-bootstrap/lib/Col";
import FormGroup from "react-bootstrap/lib/FormGroup";
import InputGroup from "react-bootstrap/lib/InputGroup";
import FormControl from "react-bootstrap/lib/FormControl";
import ListGroup from "react-bootstrap/lib/ListGroup";
import ListGroupItem from "react-bootstrap/lib/ListGroupItem";
import Breadcrumb from "react-bootstrap/lib/Breadcrumb";
import HelpBlock from "react-bootstrap/lib/HelpBlock";
import MenuItem from "react-bootstrap/lib/MenuItem";
import Alert from "react-bootstrap/lib/Alert";
import Pager from "react-bootstrap/lib/Pager";
import Accordion from "react-bootstrap/lib/Accordion";
import Collapse from "react-bootstrap/lib/Collapse";
import Dropdown from "react-bootstrap/lib/Dropdown";
import Form from "react-bootstrap/lib/Form";
import ControlLabel from "react-bootstrap/lib/ControlLabel";
import Checkbox from "react-bootstrap/lib/Checkbox";
import ToggleButton from "react-bootstrap/lib/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/lib/ToggleButtonGroup";
import Radio from "react-bootstrap/lib/Radio";
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
	OverlayTriggerProps,
	ButtonVariant as ButtonVariantI
} from "./theme";

const mapBtnVariant = (variant?: ButtonVariantI): ButtonVariantI|undefined => {
	return variant?.replace("outline-", "");
};

const Panel = React.forwardRef<_Panel, PanelProps>(({variant, ...props}, ref) => <_Panel {...props} bsStyle={variant} ref={ref}/>);
const __Panel: PanelI = (Panel as unknown as PanelI);
__Panel.Body = _Panel.Body;
__Panel.Heading = _Panel.Heading;
__Panel.Collapse = _Panel.Collapse;
__Panel.Footer = _Panel.Footer;

// Wrapper needed or webpack will hang.
const _Dropdown = (props: DropdownProps) => <Dropdown {...props} />;
const __Dropdown = _Dropdown as DropdownI;
__Dropdown.Menu = React.forwardRef((props: DropdownMenuProps, ref) => <Dropdown.Menu {...props} ref={ref} />);
(__Dropdown.Menu as any).defaultProps = {bsRole: "menu"};
__Dropdown.Toggle = React.forwardRef(({variant, ...props}: DropdownToggleProps, ref) => <Dropdown.Toggle bsStyle={variant} {...props} ref={ref}/>);
__Dropdown.Toggle.defaultProps = {bsRole: "toggle"} as any;

const _Breadcrumb: BreadcrumbI = Breadcrumb as unknown as BreadcrumbI;
_Breadcrumb.Item = Breadcrumb.Item as any;

function usePreviousValue<T>(value: T) {
	const ref = React.useRef<T>();
	React.useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}

const OverlayTrigger = (props: OverlayTriggerProps) => {
	const {show, ..._props} = props;
	const prevShow = usePreviousValue(show);

	const ref = React.useRef<any>();

	React.useEffect(() => {
		if (show && !prevShow) {
			ref.current.show();
		} else if (!show && prevShow) {
			ref.current.hide();
		}
	}, [show, prevShow]);

	return (
		<_OverlayTrigger {..._props} ref={ref} />
	);
};

const theme: Theme = {
	Panel: __Panel,
	Table,
	ProgressBar,
	Button: React.forwardRef<Button, ButtonProps>(({variant, small, ...props}, ref) => <Button {...props} bsStyle={mapBtnVariant(variant)} bsSize={small ? "small" : undefined} ref={ref}/>),
	ButtonGroup,
	ButtonToolbar,
	Overlay,
	OverlayTrigger,
	// OverlayTrigger: React.forwardRef<OverlayTrigger, OverlayTriggerProps>(({show, ...props}, ref) => <OverlayTrigger {...props} ref={ref} />),
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
	ToggleButtonGroup,
	// Radio
};
export default theme;
