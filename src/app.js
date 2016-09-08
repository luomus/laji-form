import LajiForm from "./components/LajiForm";
import React from "react";
import { render } from "react-dom"

export default props => render(<LajiForm {...props} />, props.rootElem);
