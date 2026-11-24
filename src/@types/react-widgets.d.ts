declare module "react-widgets/lib/Popup" {
	import * as React from "react";

	interface PopupProps {
		open: boolean;
		className?: string;
		children: React.ReactElement;
	}

	const Popup: React.ComponentType<PopupProps>;
	export default Popup;
}