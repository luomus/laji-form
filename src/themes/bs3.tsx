import * as React from "react";
import { Panel, Table, ProgressBar, Button, ButtonGroup, Overlay, OverlayTrigger, Popover, Tooltip, Glyphicon, Modal, Row, Col, FormGroup, InputGroup, FormControl, ListGroup, ListGroupItem } from "react-bootstrap";
import * as PanelHeading from "react-bootstrap/lib/PanelHeading";
import * as PanelCollapse from "react-bootstrap/lib/PanelCollapse";
import * as PanelBody from "react-bootstrap/lib/PanelBody";
import { Theme, PanelProps, ButtonProps } from "./theme";

const theme: Theme = {
	Panel: React.forwardRef<Panel, PanelProps>(({themeRole, children, header, useBody = true, collapsible, ...props}, ref) =>
		<Panel {...props} bsStyle={themeRole} ref={ref} eventKey={props.key}>
			{header && <PanelHeading>{header}</PanelHeading>}
			{collapsible
				? <PanelCollapse>{children}</PanelCollapse>
				: useBody ? (
					<PanelBody>
						{children}
					</PanelBody>
				) : children}
		</Panel>
	),
	Table,
	ProgressBar,
	Button: React.forwardRef<Button, ButtonProps>(({themeRole, ...props}, ref) => <Button {...props} bsStyle={themeRole} ref={ref}/>),
	ButtonGroup,
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
	ListGroupItem
};
export default theme;
