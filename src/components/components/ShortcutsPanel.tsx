import * as React from "react";
import { ByLang, FormContext } from "../LajiForm";
import { capitalizeFirstLetter, stringifyKeyCombo } from "../../utils";
import ReactContext from "../../ReactContext";

type Action = { fn: string, targetLabel: string, label: string, goOverRow?: boolean };

type Props = {
	formContext: FormContext;
	onClose: (e: Event | React.SyntheticEvent) => void;
	shortcuts: { [keyCombo: string]: Action };
}

const hash = (action: Action) => JSON.stringify(action);

export const ShortcutsPanel = React.forwardRef(({ formContext, onClose, shortcuts }: Props, ref) => {
	const { translations, topOffset = 0 } = formContext;
	const { Panel, Table } = React.useContext(ReactContext).theme;

	const actionsToShortcuts = Object.keys(shortcuts).reduce((actionsToShortcuts, keyCombo) => {
		const action = shortcuts[keyCombo];
		const hashedAction = hash(action);
		const existing = actionsToShortcuts.find(item => hash(item.action) === hashedAction);
		if (existing) {
			existing.keyCombos.push(keyCombo);
		} else { 
			actionsToShortcuts.push({ action, keyCombos: [keyCombo] });
		}
		return actionsToShortcuts;
	}, [] as {action: Action, keyCombos: string[]}[]);

	return (
		<Panel ref={ref}
			className="shortcut-help laji-form-popped z-depth-3 hidden"
			style={{top: topOffset + 5 }}
			variant="info">
			<Panel.Heading>
				<h3>
					{translations.Shortcuts}
					<button type="button" className="close pull-right" onClick={onClose}>×</button>
				</h3>
			</Panel.Heading>
			<Table>
				<tbody className="well">{
					actionsToShortcuts.map((props, i) => <ShortcutVisualization {...props} key={i} translations={translations} />)
				}</tbody>
			</Table>
		</Panel>
	);
});

const ShortcutVisualization = (
	{ action, keyCombos, translations }
	: { action: Action, keyCombos: string[], translations: ByLang }
) => {
	const {fn, targetLabel, label, ...rest} = action;
	if (["help", "autosuggestToggle"].includes(fn) || fn === "navigateSection" && rest.goOverRow) {
		return null;
	}
	let translation = "";
	if (translation) {
		translation = label;
	} else {
		translation = translations[[fn, ...Object.keys(rest)].map(capitalizeFirstLetter).join("")] as string;
	}
	if (targetLabel) {
		translation = `${translation} ${targetLabel}`;
	}
	return (
		<tr>
			<td className="laji-form-shortcut-keycombo-container">{
				keyCombos.map((keyCombo, i) => <span key={i}>{stringifyKeyCombo(keyCombo)}</span>)
			}</td>
			<td>{translation}</td>
		</tr>
	);
};
