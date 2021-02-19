import * as React from "react";
import { Panel, Table } from "react-bootstrap";
import * as PanelHeading from "react-bootstrap/lib/PanelHeading";
import * as PanelCollapse from "react-bootstrap/lib/PanelCollapse";
import * as PanelBody from "react-bootstrap/lib/PanelBody";
import { Theme, PanelProps } from "./theme";

const theme: Theme = {
	Panel: React.forwardRef<Panel, PanelProps>(({role, children, header, useBody = true, collapsible, ...props}, ref) =>
		<Panel {...props} bsStyle={role} ref={ref} eventKey={props.key}>
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
	Table: props => <Table {...props} />
};
export default theme;
