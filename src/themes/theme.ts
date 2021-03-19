import * as React from "react";

type Role = "primary" | "secondary" | "danger" | "warning" | "info" | string;
type ButtonRole = Role | "link";

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
	themeRole?: Role;
}

export interface Panel extends React.HTMLProps<PanelProps> {
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

export interface ButtonProps extends JSX.IntrinsicAttributes {
	themeRole?: ButtonRole;
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
	onHide?: Function; // eslint-disable-line @typescript-eslint/ban-types
}
export interface ModalHeader extends React.HTMLProps<any> {
	closeButton?: boolean;
}

export interface Modal extends React.HTMLProps<ModalProps> {
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

export interface InputGroup extends React.HTMLProps<any> {
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

export interface Breadcrumb extends React.HTMLProps<any> {
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
	themeRole: Role;
}

export interface PagerItemProps {
	previous?: boolean;
	next?: boolean;
	onClick?: React.MouseEventHandler<any>;
	disabled?: boolean;
	href?: string;
}

export interface Pager extends React.HTMLProps<JSX.IntrinsicAttributes> {
    Item: React.ElementType<PagerItemProps>;
}

export interface AccordionProps extends JSX.IntrinsicAttributes {
	onSelect?: React.EventHandler<any>;
	activeKey?: number;
	id?: string
}

export interface CollapseProps extends JSX.IntrinsicAttributes {
	in?: boolean;
	themeRole?: "menu";
}

export interface DropdownProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	themeRole?: Role;
	id?: string;
	pullRight?: boolean;
	open?: boolean;
	onSelect: React.EventHandler<any>;
	onToggle: React.EventHandler<any>;
}

export interface DropdownMenuProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
}

export interface Dropdown extends React.HTMLProps<JSX.IntrinsicAttributes> {
    Menu: React.ElementType<DropdownMenuProps>;
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
}
