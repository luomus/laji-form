import * as React from "react";
import { Lang } from "./components/LajiForm";
import { Theme } from "./themes/theme";
import { ReactUtilsType } from "./utils";

export interface ContextProps {
	theme: Theme;
	lang: Lang;
	setTimeout: (fn: () => void, time: number) => void;
	contextId: number;
	topOffset: number;
	bottomOffset: number;
	utils: ReactUtilsType;
}
const Context = React.createContext<ContextProps>({} as ContextProps);
export default Context;
