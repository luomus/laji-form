import * as React from "react";
import { Theme } from "./themes/theme";

export interface ContextProps {
	theme: Theme;
}
const Context = React.createContext<ContextProps>({} as ContextProps);
export default Context;
