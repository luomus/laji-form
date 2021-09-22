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

export type Panel = React.ComponentType<PanelProps> & {
    Body: React.ComponentType;
    Heading: React.ComponentType;
    Collapse: React.ComponentType;
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
	small?: boolean;
}

export type ButtonGroupProps = JSX.IntrinsicAttributes & HasMaybeChildren;

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
	onKeyDown?: (e: React.KeyboardEvent<any>) => void;
	dialogClassName?: string;
	onHide: Function // eslint-disable-line @typescript-eslint/ban-types
		| (() => void);
}

export interface ModalHeader extends React.HTMLProps<any> {
	closeButton?: boolean;
}

export type Modal = React.ComponentType<ModalProps> & {
    Body: React.ComponentType;
    Header: React.ComponentType<ModalHeader>;
    Title: React.ComponentType;
    Footer: React.ComponentType;
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

export type InputGroup = React.ComponentType<any> & {
	Addon: React.ComponentType<InputGroupAddon>;
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

export type Breadcrumb = React.ComponentType<any> & {
	Item: React.ComponentType<BreadcrumbItem>;
}

export interface BreadcrumbItem extends JSX.IntrinsicAttributes {
	key?: string | undefined | null | number;
	onClick: React.MouseEventHandler<any>;
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

export type Pager = React.ComponentType<JSX.IntrinsicAttributes> & {
    Item: React.ComponentType<PagerItemProps>;
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

export type DropdownMenuProps = JSX.IntrinsicAttributes & HasMaybeChildren & HasMaybeRef;

export type Dropdown = React.ComponentType<DropdownProps> & {
	Menu: React.ComponentType<DropdownMenuProps>;
	Toggle: React.ComponentType<DropdownToggleProps>;
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

export type ControlLabelProps = JSX.IntrinsicAttributes & HasMaybeChildren;

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
	Table: React.ComponentType<TableProps>;
	ProgressBar: React.ComponentType<ProgressBarProps>;
	Button: React.ComponentType<ButtonProps>;
	ButtonGroup: React.ComponentType<ButtonGroupProps>;
	ButtonToolbar: React.ComponentType<ButtonToolbarProps>;
	Overlay: React.ComponentType<OverlayProps>;
	OverlayTrigger: React.ComponentType<OverlayTriggerProps>;
	Popover: React.ComponentType<PopoverProps>;
	Tooltip: React.ComponentType<TooltipProps>;
	Glyphicon: React.ComponentType<GlyphiconProps>;
	Modal: Modal;
	Row: React.ComponentType<JSX.IntrinsicAttributes>;
	Col: React.ComponentType<ColProps>;
	FormGroup: React.ComponentType<FormGroupProps>
	InputGroup: InputGroup;
	FormControl: React.ComponentType<FormControlProps>;
	ListGroup: React.ComponentType<ListGroupProps>;
	ListGroupItem: React.ComponentType<ListGroupItemProps>;
	Breadcrumb: Breadcrumb;
	HelpBlock: React.ComponentType<JSX.IntrinsicAttributes>;
	MenuItem: React.ComponentType<MenuItemProps>;
	Alert: React.ComponentType<AlertProps>;
	Pager: Pager;
	Accordion: React.ComponentType<AccordionProps>;
	Collapse: React.ComponentType<CollapseProps>;
	Dropdown: Dropdown;
	Form: React.ComponentType<FormProps>;
	ControlLabel: React.ComponentType<ControlLabelProps>;
	Checkbox: React.ComponentType<CheckboxProps>;
	ToggleButton: React.ComponentType<ToggleButtonProps>;
	ToggleButtonGroup: React.ComponentType<ToggleButtonGroupProps>;
}
