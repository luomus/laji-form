import * as React from "react";
import { forwardRef, useContext } from "react";
import ReactContext from "../../ReactContext";
import { FormControlProps, ValidationState } from "../../themes/theme";
import { classNames } from "../../utils";
import Spinner from "react-spinner";

type Props = {
	loading?: boolean;
	validationState?: ValidationState;
	glyph?: React.ReactNode | null;
	onMouseOver?: React.MouseEventHandler;
	onMouseOut?: React.MouseEventHandler;
	className?: string;
	InputComponent?: React.ComponentType | null;
	extra?: React.ReactNode | React.ReactNode[] | null;
};

export const FetcherInput = forwardRef((props: Props, ref) => {
	const {loading, validationState, glyph, extra, onMouseOver, onMouseOut, className = "", InputComponent, ...inputProps} = props;  
	const {InputGroup, FormGroup} = useContext(ReactContext).theme;
	const Input = InputComponent ? InputComponent : FetcherInputDefaultInput;

	const _extra: any[] = (!Array.isArray(extra)) ? [extra] : extra;
	const hasExtras = _extra.some(item => item !== null && item !== undefined);

	const inputContent = <>
		{hasExtras && <InputGroup.Button>{..._extra}</InputGroup.Button>}
		<Input {...inputProps} ref={ref} />
		{glyph}
		{loading && <Spinner />}
	</>;

	const content = hasExtras
		? (
			<InputGroup>
				{inputContent}
			</InputGroup>
		)
		: inputContent;

	return (
		<FormGroup onMouseOver={onMouseOver} onMouseOut={onMouseOut} validationState={validationState} className={classNames(className, "fetcher-input")}>
			{content}
		</FormGroup>
	);
});

const FetcherInputDefaultInput = React.forwardRef((props: FormControlProps, ref) => {
	const {readonly, ...inputProps} = props;
	const {FormControl} = useContext(ReactContext).theme;
	return <FormControl type="text" {...inputProps} readOnly={readonly} ref={ref} />;
});

