## 15.0.0
* Migrate from protractor to playwright
* Drop context id from field html ids

## 14.3.2
* `SortArrayField`: add `multisort` option (defaults to `false`)

## 14.3.1
* `SortArrayField`: add `columns[*].tooltip` & `excludeSortableColumns` options

## 14.1.0
* Add bootstrap 5 theme

## 14.0.0
### BREAKING CHANGES:
* `react-jsonschema-form` updated to version `5`. Read more: https://react-jsonschema-form.readthedocs.io/en/latest/5.x%20upgrade%20guide/

## 13.0.0
### BREAKING CHANGES:
* Support for JSON Schema `enum` & `enumNames` properties dropped since they aren't JSON Schema. Instead, enums should be in format `{const: string, title: string}[]`.

## 12.5.0
* add `lajiGeoServerAddress` option

## 12.4.0
* Add `showButtons.same` option for `DateTimeWidget`

## 12.3.0
* Parameterize `AutosuggestField` `toggleable` default `toggle` status, `tooltip` and `placeholder`

## 12.2.0
* Add `jsonPointer` operator to `computeUiSchema` (used by e.g. `MultiArrayField`, `ConditionalUiSchemaField`)

## 12.1.0
* MultiArrayField can persist by parent id
* ConditionalUiSchemaField rules "isEdit" and "isAdmin" can be given as {"rule": "isEdit"}, so that it can leverage e.g. {"complement": true}
* SelectWidget selects focused with tab
* AutosuggestWidget toggler moved to left side of input

## 12.0.4
* Checkbox widget hides label of nonactive button if has no custom labels. If a button for undefined isn't shown, click either button toggles the value.

## 12.0.0
### BREAKING CHANGES:
* Buttons don't use `primary` variant by default & not strong text.

## 11.0.0
* TS declarations files included in `lib`

### BREAKING CHANGES:
* `lib/app` moved to `lib/index`

## 10.0.0
* Style framework agnostic, bootstrap 3 dependency is optional. More in README.
* Improved app wrapper

### BREAKING CHANGES:
* `react-bootstrap@0.33.1` must be installed separately
* LajiForm component can't be accessed anymore through `LajiForm.app.refs.lajiform`. Use `LajiForm.lajiForm` instead.

## 9.0.1
* Add `allowOnlyYear` option for `DateTimeWidget` & `DateWidget`

## 9.0.0
### BREAKING CHANGES:
* Revert "Buttons don't use `primary` bs role by default & not strong text"

## 8.1.0
* Replace boolean switches with radio buttons

## 8.0.0
* add `activeHeightOffset` to `SingleActiveArrayField` table

### BREAKING CHANGES:
* Buttons don't use `primary` bs role by default & not strong text

## 7.2.0
* Add `submitOnlySchemaValidations`

## 7.1.0
* Add `mediaMetadata` prop, which replaces `defaultImageMetadata` in settings (breaking change! Accidentally released as feature release)

## 7.0.0
* Globally interpreted `[test].injections` moved to `ui:injections`

## 6.1.0
* Add `tag` option to `PlainTextWidget`

## 6.0.0
* Exclude TypeScript declarations in `lib`
* Export tests to npm package

### BREAKING CHANGES:
* Doesn't include typescript declarations anymore

## 5.8.0
* Include TypeScript declarations in `lib`

## 5.7.3
* `InjectField` `fields` must begin with "/" if they are to be handled as JSON pointers properly

## 5.7.0
* `FakePropertyField`: add `skipIfEmpty` to field options
* `URLWidget`: add `template` option

## 5.6.0
* add `NumberWidget`

## 5.5.0
* `AutosuggestField`: added `suggestionValueParse` & `suggestionReceivers` support fallback field to use

## 5.4.0
* remove `getTaxonAutocompleteHTMLString` method from ApiClient

## 5.3.0
* add `getTaxonAutocompleteHTMLString` method for ApiClient

## 5.2.0
* Add named place removal

## 5.1.2
* Use upstream react-jsonschema-form instead of private fork

## 5.1.0
* Add `onValidationError` prop

## 5.0.0
### BREAKING CHANGES:
* Remove `ConditionalAdditionalItemsArrayField` (can be implemented with `MultiArrayField`).
* Remove `SingleActiveArrayField` `split` renderer (can be implemented with `MultiArrayField`).

## 4.9.0
* Add `ToggleAdditionalArrayFieldsField`

## 4.8.0
* Add `InjectTaxonCensusFilterField`
* Add `MultiAnyToBooleanField`

## 4.7.0
* `ScopeField` doesn't remove props from `schema`, but hides them with `uiSchema`
* `LocationChooserField` allows JSON pointer for `geometryField`

## 4.6.0
* Add `FilterArrayField`
* uiSchema option `rules` allows `complement` option

## 4.5.0
* Add `FilterArrayField`
* uiSchema components that use `rules` allow `complement` option, which complements the rule result

## 4.4.0
* Add `AudioArrayField`

## 4.3.0
* add `autoFocus` root uiSchema option

## 4.2.0
* Add SectionArrayField & MultiArrayField

## 4.1.0
* Add `FakePropertyField`
* add `data` option to `MapField`
* InjectField works with proper JSON pointers

## 4.0.0
### BREAKING CHANGES:
* `src/validation.js` default export function doesn't take in `liveErrors` or `liveWarnings` parameters any more

## 3.0.1
* add deprecation warning about utils `getUpdateObjectFromJSONPath` and `updateSafelyWithJSONPath` (renamed to 'JSONPointer')

## 3.0.0
### BREAKING CHANGES:
* `validate()` signature has changed
* `onSubmit()` signature has changed, uses `formData` from `state`
* `submit()` signature has changed

## 2.2.0
* Label can be overridden through `fields` prop

## 2.1.2
* Upgrade RJSF to 2.0.0-alpha (got rid of private fork finally!), fixes computing array defaults etc

## 2.1.1
* Schema of type `number` or `integer` aren't rendered as number inputs

## 2.1.0
* Add showID option for person AutosuggestWidget (for admin only)
* Pass `formContext` from props to RJSF

## 2.0.9
* Add `sideEffects` options for ImageArrayField

## 2.0.5
* Pass `fields` and `widgets` from props to RJSF
* don't `src` in npm package

## 2.0.0
### BREAKING CHANGES:
* Remove `TemplateArrayField`

## 1.2.6
* `lib` keeps src folder structure & doesn't include styles

## 1.2.5
* include `src` in npm package

## 1.2.4
* Fix 'main' in package.json

## 1.2.0
* Background jobs can be retried
* ImageArrayField sends DELETE request to API when image is removed

## 1.1.0
* Listen to keyboard events on HTML document level

## 1.0.0
* Started using semver
