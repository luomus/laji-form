import * as React from "react";

type Variant = "primary" | "secondary" | "danger" | "warning" | "info" | string;
type ButtonVariant = Variant | "link";

interface HasMaybeChildren {
	children?: React.ReactNode;
}

interface HasMaybeRef {
	ref?: React.Ref<any> | React.LegacyRef<any>;
}

interface HasMaybeStyle {
	style?: React.CSSProperties;
}

interface HasMaybeClassName {
	className?: string;
}

export interface PanelProps {
	expanded?: boolean;
	onToggle?: () => void;
	onClick?: () => void;
	eventKey?: number;
	variant?: Variant;
}

export type Panel = React.ElementType<PanelProps> & {
    Body: React.ElementType;
    Heading: React.ElementType;
    Collapse: React.ElementType;
}

export interface TableProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeClassName {
	hover?: boolean;
	bordered?: boolean;
	condensed?: boolean;
}

export interface ProgressBarProps extends JSX.IntrinsicAttributes {
	now?: number;
}

export interface ButtonProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeClassName, HasMaybeRef {
	variant?: ButtonVariant;
	active?: boolean;
	disabled?: boolean;
	onClick?: React.MouseEventHandler<any>;
	block?: boolean;
	id?: string;
}

export interface ButtonGroupProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
}
export interface ButtonToolbarProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeClassName {
}

export interface OverlayProps extends JSX.IntrinsicAttributes {
	show?: boolean;
	placement?: "top" | "bottom" | "left" | "right" | string;
	rootClose?: boolean;
	onHide?: Function; // eslint-disable-line @typescript-eslint/ban-types
	target?: Function // eslint-disable-line @typescript-eslint/ban-types
		| React.ReactInstance;
	container?: React.Component;
}

export interface OverlayTriggerProps extends HasMaybeRef, OverlayProps {
	overlay: any;
	key?: string | number | undefined;
}

export interface PopoverProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	id?: string;
	title?: React.ReactNode;
}

export interface TooltipProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	id?: string;
}

type Glyph = "ok" | "refresh" | "warning-sign" | "plus" | "camera" | "headphones" | "user" | "flash" | "menu-hamburger";

export interface GlyphiconProps extends JSX.IntrinsicAttributes, HasMaybeStyle, HasMaybeClassName {
	glyph: Glyph | string;
}

export interface ModalProps {
	show?: boolean
	enforceFocus?: boolean;
	keyboard?: boolean;
	onKeyDown?: (e: React.KeyboardEvent) => void;
	dialogClassName?: string;
	onHide: () => void;
}

export interface ModalHeader extends React.HTMLProps<any> {
	closeButton?: boolean;
}

export type Modal = React.ElementType<ModalProps> & {
    Body: React.ElementType;
    Header: React.ElementType<ModalHeader>;
    Title: React.ElementType;
    Footer: React.ElementType;
}

export interface ColProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeClassName {
	xs?: number;
	sm?: number;
	md?: number;
	lg?: number;
	xsOffset?: number;
}

export type ValidationState = "success" | "warning" | "error"; 

export interface FormGroupProps extends JSX.IntrinsicAttributes, HasMaybeClassName {
	validationState?: ValidationState | null;
	onMouseOver?: React.MouseEventHandler<any>;
	onMouseOut?: React.MouseEventHandler<any>;
}

export type InputGroup = React.ElementType<any> & {
	Addon: React.ElementType<InputGroupAddon>;
}

export interface InputGroupAddon extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeClassName {
	tabIndex?: number;
	onClick?: React.MouseEventHandler<any>;
	onMouseDown?: React.MouseEventHandler<any>;
}

export interface FormControlProps extends React.HTMLProps<any> {
	type?: HTMLInputElement["type"];
	readOnly?: boolean;
	validationState?: ValidationState;
}

export interface ListGroupProps extends JSX.IntrinsicAttributes {
	fill?: boolean;
}

export interface ListGroupItemProps extends JSX.IntrinsicAttributes, HasMaybeClassName {
	onClick?: React.MouseEventHandler<any>;
	disabled?: boolean;
	header?: React.ReactNode;
	active?: boolean;
}

export type Breadcrumb = React.ElementType<any> & {
	Item: React.ElementType<BreadcrumbItem>;
}

export interface BreadcrumbItem extends JSX.IntrinsicAttributes {
	key?: string | undefined | null | number;
}

export interface MenuItemProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	onClick?: React.MouseEventHandler<any>;
	active?: boolean;
	disabled?: boolean;
}

export interface AlertProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	variant: Variant;
}

export interface PagerItemProps {
	previous?: boolean;
	next?: boolean;
	onClick?: React.MouseEventHandler<any>;
	disabled?: boolean;
	href?: string;
}

export type Pager = React.ElementType<JSX.IntrinsicAttributes> & {
    Item: React.ElementType<PagerItemProps>;
}

export interface AccordionProps extends JSX.IntrinsicAttributes {
	onSelect?: React.EventHandler<any>;
	activeKey?: number;
	id?: string
}

export interface CollapseProps extends JSX.IntrinsicAttributes {
	in?: boolean;
}

export interface DropdownProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	id: string;
	pullRight?: boolean;
	open?: boolean;
	onSelect: React.EventHandler<any>;
	onToggle: React.EventHandler<any>;
}

export interface DropdownMenuProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeRef {
}

export type Dropdown = React.ElementType<DropdownProps> & {
	Menu: React.ElementType<DropdownMenuProps>;
	Toggle: React.ElementType<DropdownToggleProps>;
}

export interface DropdownToggleProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeRef {
	id?: string;
	noCaret?: boolean;
	variant?: Variant;
}


export interface FormProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	inline?: boolean;
	onSubmit?: React.EventHandler<any>;
}

export interface ControlLabelProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
}

export interface CheckboxProps extends JSX.IntrinsicAttributes {
	title?: string;
	checked?: boolean;
	onChange?: React.EventHandler<any>;
}

export interface ToggleButtonProps extends JSX.IntrinsicAttributes, HasMaybeClassName, HasMaybeChildren {
	disabled?: boolean;
	value?: any;
}

export interface ToggleButtonGroupProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	type: "radio" | "checkbox";
	name?: string;
	defaultValue?: boolean;
	onChange?: React.EventHandler<any>;
}

export interface Theme {
	Panel: Panel;
	Table: React.ElementType<TableProps>;
	ProgressBar: React.ElementType<ProgressBarProps>;
	Button: React.ElementType<ButtonProps>;
	ButtonGroup: React.ElementType<ButtonGroupProps>;
	ButtonToolbar: React.ElementType<ButtonToolbarProps>;
	Overlay: React.ElementType<OverlayProps>;
	OverlayTrigger: React.ElementType<OverlayTriggerProps>;
	Popover: React.ElementType<PopoverProps>;
	Tooltip: React.ElementType<TooltipProps>;
	Glyphicon: React.ElementType<GlyphiconProps>;
	Modal: Modal;
	Row: React.ElementType<JSX.IntrinsicAttributes>;
	Col: React.ElementType<ColProps>;
	FormGroup: React.ElementType<FormGroupProps>
	InputGroup: InputGroup;
	FormControl: React.ElementType<FormControlProps>;
	ListGroup: React.ElementType<ListGroupProps>;
	ListGroupItem: React.ElementType<ListGroupItemProps>;
	Breadcrumb: Breadcrumb;
	HelpBlock: React.ElementType<JSX.IntrinsicAttributes>;
	MenuItem: React.ElementType<MenuItemProps>;
	Alert: React.ElementType<AlertProps>;
	Pager: Pager;
	Accordion: React.ElementType<AccordionProps>;
	Collapse: React.ElementType<CollapseProps>;
	Dropdown: Dropdown;
	Form: React.ElementType<FormProps>;
	ControlLabel: React.ElementType<ControlLabelProps>;
	Checkbox: React.ElementType<CheckboxProps>;
	ToggleButton: React.ElementType<ToggleButtonProps>;
	ToggleButtonGroup: React.ElementType<ToggleButtonGroupProps>;
}
