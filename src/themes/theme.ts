import * as React from "react";

type Role = "primary" | "secondary" | "danger" | "warning" | "info" | "link" | string;

export interface PanelProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeRef, HasMaybeClassName {
	id?: string;
	style?: React.CSSProperties;
	themeRole?: Role;
	collapsible?: "true";
	expanded?: boolean;
	onToggle?: () => void;
	eventKey?: number;
	header?: React.ReactNode;
	useBody?: boolean;
}

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

export interface TableProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeClassName {
	hover?: boolean;
	bordered?: boolean;
	condensed?: boolean;
}

export interface ProgressBarProps extends JSX.IntrinsicAttributes {
	now?: number;
}

export interface ButtonProps extends JSX.IntrinsicAttributes {
	themeRole?: Role;
}

export interface ButtonGroupProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
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

export interface ModalProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
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

export interface Theme {
	Panel: (props: PanelProps) => JSX.Element | null;
	Table: React.ElementType<TableProps>;
	ProgressBar: React.ElementType<ProgressBarProps>;
	Button: React.ElementType<ButtonProps>;
	ButtonGroup: React.ElementType<ButtonGroupProps>;
	Overlay: React.ElementType<OverlayProps>;
	OverlayTrigger: React.ElementType<OverlayTriggerProps>;
	Popover: React.ElementType<PopoverProps>;
	Tooltip: React.ElementType<TooltipProps>;
	Glyphicon: React.ElementType<GlyphiconProps>;
	Modal: Modal;
	Row: React.ElementType<any>;
	Col: React.ElementType<ColProps>;
}
