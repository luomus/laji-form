import * as React from "react";
import { Panel, Table, ProgressBar, Button, ButtonGroup, Overlay, OverlayTrigger, Popover, Tooltip } from "react-bootstrap";
import * as PanelHeading from "react-bootstrap/lib/PanelHeading";
import * as PanelCollapse from "react-bootstrap/lib/PanelCollapse";
import * as PanelBody from "react-bootstrap/lib/PanelBody";
import { Theme, PanelProps, ButtonProps, OverlayTriggerProps } from "./theme";

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
	Table: props => <Table {...props} />,
	ProgressBar: props => <ProgressBar {...props} />,
	Button: React.forwardRef<Button, ButtonProps>(({themeRole, ...props}, ref) => <Button {...props} bsStyle={themeRole} ref={ref}/>),
	ButtonGroup: props => <ButtonGroup {...props}/>,
	Overlay: props => <Overlay {...props} />,
	OverlayTrigger: React.forwardRef<OverlayTrigger, OverlayTriggerProps>((props, ref) => <OverlayTrigger {...props} ref={ref} />),
	Popover: props => <Popover {...props} />,
	Tooltip: props => <Tooltip {...props} />,
};
export default theme;
