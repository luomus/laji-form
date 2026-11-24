import "react-widgets/lib/Calendar";

declare module "react-widgets/lib/Calendar" {
	interface CalendarProps {
		tabIndex?: number | string;
		activeId?: string;
	}
}
