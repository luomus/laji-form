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
	ref?: React.Ref<any>;
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
	now: number;
}

export interface ButtonProps extends JSX.IntrinsicAttributes {
	themeRole?: Role;
}

export interface ButtonGroupProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
}

export interface OverlayProps extends JSX.IntrinsicAttributes {
	show?: boolean;
	placement?: "top" | "bottom" | "left" | "right";
	rootClose?: boolean;
	onHide?: () => void;
	target?: React.ReactInstance;
	container?: React.Component;
}

export interface OverlayTriggerProps extends HasMaybeRef, OverlayProps {
	overlay: any;
	key: string | number | undefined;
}

export interface PopoverProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	id?: string;
	title?: string;
}

export interface TooltipProps extends JSX.IntrinsicAttributes, HasMaybeChildren {
	id?: string;
}

type Glyph = "ok" | "refresh" | "warning-sign" | "plus" | "camera" | "headphones" | "user" | "flash" | "menu-hamburger";

export interface GlyphiconProps extends JSX.IntrinsicAttributes, HasMaybeStyle, HasMaybeClassName {
	glyph: Glyph;
}

export interface Theme {
	Panel: (props: PanelProps) => JSX.Element | null;
	Table: (props: TableProps) => JSX.Element;
	ProgressBar: (props: ProgressBarProps) => JSX.Element;
	Button: (props: ButtonProps) => JSX.Element | null;
	ButtonGroup: (props: ButtonGroupProps) => JSX.Element;
	Overlay: (props: OverlayProps) => JSX.Element;
	OverlayTrigger: (props: OverlayTriggerProps) => JSX.Element | null;
	Popover: (props: PopoverProps) => JSX.Element;
	Tooltip: (props: TooltipProps) => JSX.Element;
	Glyphicon: (props: GlyphiconProps) => JSX.Element;
}

