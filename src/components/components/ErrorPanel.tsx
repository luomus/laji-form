import * as React from "react";
import ReactContext from "../../ReactContext";
import { GlyphButton } from "../components";

export type PanelError = {
	label: string;
	error: Error | string;
	id?: string;
	getId: () => string;
	extra: React.ReactNode[] | null;
	disabled?: boolean
}

type Props = {
	errors: PanelError[];
	title: string;
	clickHandler: (id?: string) => void
	poppedToggle: React.MouseEventHandler;
	showToggle?: boolean;
	classNames?: string;
	footer?: React.ReactNode;
}

type State = { expanded: boolean };

export class ErrorPanel extends React.Component<Props, State> {
	static contextType = ReactContext;

	constructor(props: Props) {
		super(props);
		this.state = {expanded: true};
	}

	expand = () => {
		if (!this.state.expanded) this.setState({expanded: true});
	};
	collapseToggle = () => this.setState({expanded: !this.state.expanded});

	render() {
		const {errors, title, clickHandler, poppedToggle, showToggle, classNames, footer} = this.props;

		if (errors.length === 0) return null;

		const {Panel, ListGroup} = this.context.theme;

		return (
			<Panel collapsible="true" onToggle={this.collapseToggle} className={classNames}>
				<Panel.Heading>
					   <div className="laji-form-clickable-panel-header" onClick={this.collapseToggle}>
						   <div className="panel-title">
							   {title}
							   <span className="pull-right">
								   <GlyphButton glyph={this.state.expanded ? "chevron-up" : "chevron-down"} variant="link" />
								   {showToggle ? <GlyphButton glyph="new-window" variant="link" onClick={poppedToggle} /> : null}
							   </span>
						   </div>
					   </div>
				</Panel.Heading>
				<Panel.Collapse in={this.state.expanded}>
					<ListGroup>
						{errors.map((props, i) => <ErrorPanelError key={i} clickHandler={clickHandler} {...props} />)}
					</ListGroup>
				</Panel.Collapse>
				{footer
					? (
						<Panel.Footer>
							{footer}
						</Panel.Footer>
					)
					: null}
			</Panel>
		);
	}
}

function ErrorPanelError({label, error, id, getId, extra = null, disabled, clickHandler}: PanelError & Pick<Props, "clickHandler">) {
	const message = error && (error as Error).message ? (error as Error).message : error;
	const _clickHandler = React.useCallback(() => {
		clickHandler(id || (getId ? getId() : undefined));
	}, [clickHandler, id, getId]);

	const {ListGroupItem} = React.useContext(ReactContext).theme;
	return (
		<ListGroupItem onClick={_clickHandler} disabled={disabled}>
			{label ? <b>{label}:</b> : null} {message} {extra}
		</ListGroupItem>
	);
}

