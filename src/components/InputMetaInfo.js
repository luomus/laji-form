import React from "react";
export default ({children, className}) => {
	return (<div className={"input-meta" + (className ? " " + className : "")}>{children}</div>)
}
