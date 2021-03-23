import * as React from "react";
import {Panel as _Panel, Table, ProgressBar, Button, ButtonGroup, ButtonToolbar, Overlay, OverlayTrigger, Popover, Tooltip, Glyphicon, Modal, Row, Col, FormGroup, InputGroup, FormControl, ListGroup, ListGroupItem, Breadcrumb, HelpBlock, MenuItem, Alert, Pager, Accordion, Collapse as _Collapse, Dropdown, Form, ControlLabel, Checkbox, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { Theme, PanelProps, ButtonProps, Panel as PanelI } from "./theme";

const Panel = React.forwardRef<_Panel, PanelProps>(({variant, ...props}, ref) => <_Panel {...props} bsStyle={variant} ref={ref}/>);
const __Panel: PanelI = (Panel as unknown as PanelI);
__Panel.Body = _Panel.Body;
__Panel.Heading = _Panel.Heading;
__Panel.Collapse = _Panel.Collapse;

const Collapse = _Collapse as any;

const theme: Theme = {
	Panel: __Panel,
	Table,
	ProgressBar,
	Button: React.forwardRef<Button, ButtonProps>(({variant, ...props}, ref) => <Button {...props} bsStyle={variant} ref={ref}/>),
	ButtonGroup,
	ButtonToolbar,
	Overlay,
	OverlayTrigger,
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
	Breadcrumb,
	HelpBlock,
	MenuItem,
	Alert: ({variant, ...props}) => <Alert {...props} bsStyle={variant}/>,
	Pager,
	Accordion,
	//Collapse: ({variant, ...props}) => <Collapse {...props} bsRole={variant}/>,
	Collapse,
	Dropdown,
	Form,
	ControlLabel,
	Checkbox,
	ToggleButton,
	ToggleButtonGroup
};
export default theme;
