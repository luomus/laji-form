import * as React from "react";
import { parseJSONPointer } from "../../utils";
import * as L from "leaflet";

export default function DescriptonField(props) {
	const {description} = props;
	if (!description) {
		return null;
	}
	const replacePatterns = description.match(/%{.*?}/g) || [];
	const _description = replacePatterns.reduce((desc, replacePattern) => {
		replacePattern = replacePattern.replace(/%|{|}/g, "");
		let replacement;
		const formData = props.registry.formContext.services.rootInstance.getFormData();
		if (replacePattern[0] === "#") {
			replacement = parseJSONPointer(formData, replacePattern.substr(1));
		// TODO DescriptionField doesn't receive formData
		//} else if (replacePattern[0] === "/") {
		//	replacement = parseJSONPointer(props.formData, replacePattern);
		} else if (replacePattern.startsWith("bbox")) {
			const field = replacePattern.match(/\((.*)\)/)[1];
			const value = parseJSONPointer(formData, field.substr(1));
			const bounds = L.geoJSON(value).getBounds();
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast(); 
			replacement = `${sw.lat}:${ne.lat}:${sw.lng}:${ne.lng}:WGS84`;
		} else if (replacePattern === "lang") {
			replacement = props.registry.formContext.lang;
		}
		return desc.replace(`%{${replacePattern}}`, replacement);
	}, description);
	return <span dangerouslySetInnerHTML={{__html: _description}} />;
}
