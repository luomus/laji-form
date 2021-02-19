import * as React from "react";

export interface PanelProps extends JSX.IntrinsicAttributes, HasMaybeChildren, HasMaybeRef {
	id?: string;
	className?: string;
	style?: React.CSSProperties;
	role?: "info" | string;
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

export interface Theme {
	Panel: (props: PanelProps) => JSX.Element | null;
}

