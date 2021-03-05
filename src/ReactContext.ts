import * as React from "react";
import { Theme } from "./themes/theme";
import StubTheme from "./themes/stub";

export interface ContextProps {
	theme: Theme;
}
const Context = React.createContext<ContextProps>({theme: StubTheme});
export default Context;
