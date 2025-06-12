import * as React from "react";
import ReactContext from "../../ReactContext";
import { Button, ButtonProps } from "../components";
import { Glyph } from "../../themes/theme";

type Props = ButtonProps & {
	glyph: Glyph;
}

export const GlyphButton = React.forwardRef((props: Props, ref) => {
	const {glyph, ...buttonProps} = props;
	const {Glyphicon} = React.useContext(ReactContext).theme;
	return (
		<Button {...buttonProps} 
		        ref={ref}
		        className={`glyph-button${props.className ? ` ${props.className}` : ""}`} 
		        tooltipPlacement={props.tooltipPlacement || "left"}>
			<Glyphicon glyph={glyph} />
			{props.children}
		</Button>
	);
});

