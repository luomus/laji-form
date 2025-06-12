import * as React from "react";
import { useCallback, useContext, useState } from "react";
import ReactContext from "../../ReactContext";

type TooltipComponentProps = {
	tooltip?: string;
	children: React.ReactNode;
	id?: string;
	placement?: string
	trigger?: string
	className?: string;
}

/** Tooltip component that doesn't show tooltip for empty/undefined tooltip */
export const TooltipComponent = ({tooltip, children, id, placement, trigger, className}: TooltipComponentProps) => {
	const [show, setShow] = useState(false);
	const onMouseOver = useCallback(() => setShow(true), []);
	const onMouseOut = useCallback(() => setShow(false), []);

	const {OverlayTrigger, Tooltip} = useContext(ReactContext).theme;
	const overlay = (
		tooltip ? (
			<OverlayTrigger
				show={show}
				placement={placement}
				trigger={trigger === "hover" ? [] : trigger}
				key={`${id}-overlay`}
				overlay={
					<Tooltip id={`${id}-tooltip`} className={`${className}`}>{React.isValidElement(tooltip) ? tooltip : <span dangerouslySetInnerHTML={{__html: tooltip}} />}</Tooltip>
				}
			>
				{children}
			</OverlayTrigger>
		): <React.Fragment>{children}</React.Fragment>
	);

	return (trigger === "hover") ? (
		<div onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
			{overlay}
		</div>
	) : overlay;
};
