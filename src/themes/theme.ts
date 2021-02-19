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

export interface TableProps extends HasMaybeChildren {
	hover?: boolean;
	bordered?: boolean;
	condensed?: boolean;
	className?: string;
}

export interface ProgressBarProps {
	now: number;
}

export interface ButtonProps extends JSX.IntrinsicAttributes {
	themeRole?: Role;
}

export interface Theme {
	Panel: (props: PanelProps) => JSX.Element | null;
	Table: (props: TableProps) => JSX.Element;
	ProgressBar: (props: ProgressBarProps) => JSX.Element;
	Button: (props: ButtonProps) => JSX.Element | null;
}

