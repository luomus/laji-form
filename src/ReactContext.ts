import * as React from "react";
import { Lang } from "./components/LajiForm";
import { Theme } from "./themes/theme";

export interface ContextProps {
	theme: Theme;
	lang: Lang;
	setTimeout: (fn: () => void, time: number) => void;
}
const Context = React.createContext<ContextProps>({} as ContextProps);
export default Context;
