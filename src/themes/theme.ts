import * as React from "react";

type Role = "primary" | "secondary" | "danger" | "warning" | "info" | "link" | string;

export interface PanelProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeRef {
	id?: string;
	className?: string;
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

export interface TableProps extends JSX.IntrinsicAttributes , HasMaybeChildren {
	hover?: boolean;
	bordered?: boolean;
	condensed?: boolean;
	className?: string;
}

export interface ProgressBarProps extends JSX.IntrinsicAttributes {
	now: number;
}

export interface ButtonProps extends JSX.IntrinsicAttributes {
	themeRole?: Role;
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

export interface Theme {
	Panel: (props: PanelProps) => JSX.Element | null;
	Table: (props: TableProps) => JSX.Element;
	ProgressBar: (props: ProgressBarProps) => JSX.Element;
	Button: (props: ButtonProps) => JSX.Element | null;
	Overlay: (props: OverlayProps) => JSX.Element;
	OverlayTrigger: (props: OverlayTriggerProps) => JSX.Element | null;
	Popover: (props: PopoverProps) => JSX.Element;
}

