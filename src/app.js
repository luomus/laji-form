import LajiForm from "./components/LajiForm";
import { render } from "react-dom"

export default props => render(<LajiForm {...props} />, props.rootElem);
