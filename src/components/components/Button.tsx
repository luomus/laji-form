import * as React from "react";
import ReactContext from "../../ReactContext";
import { TooltipComponent } from "../components";
import { ButtonProps as ThemedButtonProps } from "src/themes/theme";
import { forwardRef } from "react";

export type ButtonProps = ThemedButtonProps & {
	tooltip?: string;
	tooltipPlacement?: string;
	tooltipTrigger?: string;
	tooltipClass?: string;
}

export const Button = forwardRef(({
	tooltip,
	tooltipPlacement,
	tooltipTrigger,
	tooltipClass,
	..._props
}: ButtonProps, ref) => {
	const { Button: _Button } = React.useContext(ReactContext).theme;
	return (
		<TooltipComponent tooltip={tooltip} placement={tooltipPlacement} trigger={tooltipTrigger} className={tooltipClass}>
			<_Button {..._props} ref={ref} >{_props.children}</_Button>
		</TooltipComponent>
	);
});
