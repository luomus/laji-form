import * as React from "react";
import { useContext } from "react";
import ReactContext from "../../ReactContext";
import { classNames } from "../../utils";
import { OverlayTrigger } from "../components";

type Props = {
	help?: string;
	id: string;
	focusable?: boolean
	onFocus?: () => void;
	onBlur?: () => void;
	className?: string;
	onClick?: React.MouseEventHandler;
	standalone?: boolean
}

/**
 * @param standalone If provided, the help icon will handle **accessibility** itself.
 * If not provided, the parent element must take care of showing the tooltip.
 *
 * **accessibility** means that it handles showing the tooltip on focus & hover, and
 */
export function Help({help, id, focusable = false, onFocus, onBlur, className, onClick, standalone}: Props) {
	const {Tooltip} = useContext(ReactContext).theme;

	const [focused, setFocused] = React.useState<boolean>(false);

	const onHelpFocus = React.useCallback(() => {
		setFocused(true);
	}, []);

	const onHelpBlur = React.useCallback(() => {
		setFocused(false);
	}, []);

	const helpGlyph = <span className={classNames("laji-form-help-glyph", "text-muted", className)}
	                        tabIndex={focusable ? 0 : -1}
	                        onFocus={standalone ? onHelpFocus : onFocus}
	                        onBlur={standalone ? onHelpBlur : onBlur}
	                        onClick={onClick} />;
	const tooltip = <Tooltip id={id}><span dangerouslySetInnerHTML={{__html: help || ""}} /></Tooltip>;
	return help ? (
		<OverlayTrigger placement="right" overlay={tooltip} show={standalone && focused || undefined}>
			<>
				{helpGlyph}
				{standalone && <div id={`${id}--help`} style={{ display: "none" }}>{ help }</div>}
			</>
		</OverlayTrigger>
	) : helpGlyph;
}

