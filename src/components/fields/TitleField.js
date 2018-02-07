import React from "react";
import { Help } from "../components";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { isEmptyString } from "../../utils";

export default ({title, className, buttons, help, id}) => {
	if (isEmptyString(title)) return null;

	if (!help) return <legend className={className}>{title} {buttons}</legend>;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>
							<span>
								<strong>{title}</strong><br />
								{help}
							</span>
						</Tooltip>;

	return (
		<legend>
			<OverlayTrigger placement="right" overlay={tooltipElem}>
				<span>{title} <Help /> {buttons}</span>
			</OverlayTrigger>
		</legend>
	);
};

