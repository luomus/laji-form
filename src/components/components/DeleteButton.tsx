import * as React from "react";
import ReactContext from "../../ReactContext";
import { ButtonProps } from "../components";
import { FormContext } from "../LajiForm";
import { ConfirmButton } from "./ConfirmButton";


type Props = ButtonProps & {
	confirmStyle?: "browser";
	corner?: boolean;
	tooltip?: string;
	disabled?: boolean;
	readonly?: boolean;
	glyphButton?: boolean;
	confirm?: boolean;
	confirmPlacement?: string;
	onClick: () => void;
	style?: React.CSSProperties;
	translations: FormContext["translations"]
}

type State = {
	show?: boolean;
}

export class DeleteButton extends React.Component<Props, State> {
	static contextType = ReactContext;

	render() {
		const {props} = this;
		const {
			corner,
			glyphButton = true,
			...maybeProps
		} = props;
		let buttonClassName = glyphButton ? "glyph-button" : "";
		buttonClassName += corner ? " button-corner" : "";
		if (props.className) {
			buttonClassName = `${buttonClassName} ${props.className}`;
		}
		if (props.id !== undefined) {
			(maybeProps as any).id = `${props.id}-delete`;
		}
		return (
			<ConfirmButton {...maybeProps}
						   variant="danger"
						   className={buttonClassName}
						   prompt={props.translations.ConfirmRemove}
						   confirmButtonVariant="danger"
						   confirmButtonText={props.translations.Remove}
			               confirmButtonId={`${this.props.id}-delete-confirm-yes`}
			               cancelButtonId={`${this.props.id}-delete-confirm-no`}>
				{this.props.children} {"✖"}
			</ConfirmButton>
		);
	}
}
