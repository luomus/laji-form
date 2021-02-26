import * as React from "react";
import { Theme } from "./themes/theme";

export interface ContextProps {
	theme: Theme;
}
const Context = React.createContext<Partial<ContextProps>> ({});
export default Context;
