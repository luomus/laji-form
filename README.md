# README #

LajiForm is a dynamic form built on React. It can be used as a standalone library or as a React component. LajiForm is a wrapper for [react-jsonschema-form](https://github.com/mozilla-services/react-jsonschema-form).

# Installing #

```
npm install laji-form --save
```

If you are going to use the bootstrap 3 theme, you need to install also `react-bootstrap`:

```
npm install react-bootstrap@0.33.1 --save
```

# Usage as a library #

LajiForm passes all its properties to react-jsonschema-form. Read the documentation for react-jsonschema-form.

## Usage as a standalone library ##

```
import LajiForm from "laji-form";

new LajiForm({
  schema: schema,
  uiSchema: uiSchema, formData: formData,
  rootElem: document.getElementById("app")
});
```

You can update the properties with ```setState(props)```. You need to pass only the properties that you are changing, since it just calls the React component's ```setState(props)```.

You can unmount the component with ```unmount()```.

## Usage as a React component ##

```
import React from "react";
import { render } from "react-dom";
import LajiForm from "laji-form/lib/components/LajiForm";

render(<LajiForm
    schema={...}
    uiSchema={...}
    formData={...} />,
  document.getElementById("app"));
```

## API Client ##

In addition to properties you would pass to &lt;Form /&gt;, you must pass an api client implementation, if you need to use fields that use lajitest.api.fi. The api client implementation must have ```fetch()``` -method, which **returns a Promise**.

```fetch(path, query, options)``` parameters are as follows:

* **path:** URL path for GET.
* **query:** Object, where keys are param names and values are param values.
* **options:** Object containing options for request.

See the example implementation in [src/playground/ApiClientImplementation.js](https://bitbucket.org/luomus/laji-form.js/src/HEAD/playground/ApiClientImplementation.js).

Pass the implementation to LajiForm like so:

```
<LajiForm apiClient={new ApiClientImplementation()} ... />
```

## Themes ##

### Bootstrap 3
LajiForm provides bootstrap 3 theme. To use it, you need to install `react-bootstrap@0.33.1` and provide the built-in bootstrap 3 theme it as a prop:

```
import bs3 from "laji-form/lib/themes/bs3";

<LajiForm theme={bs3} ... />
```

### Bootstrap 5

To use bootstrap 5 theme, you need to install following packages:
```
npm install --save react-bootstrap-5@npm:react-bootstrap@2.5.0
mpn install --save @fortawesome/fontawesome-svg-core@6.2.0
npm install --save @fortawesome/free-solid-svg-icons@6.2.0
npm install --save @fortawesome/react-fontawesome@0.2.0
```

Then it can be used by providing the theme to the form:

```
import bs5 from "laji-form/lib/themes/bs5";

<LajiForm theme={bs5} ... />
```

You can also use a custom theme and provide it the same way. There is a theme interface `themes/theme.ts` which the theme must implement.

## Notifications ##

LajiForm expects a notification implementation as a paratemer `notifier`. The `notifier` object must implement the interface below:

```
{
	success: message => (),
	warning: message => (),
	info: message => (),
	error: message => (),
}
```

## Styles ##

Styles can be found at  ```dist/styles.css```.

# Development #

Run `npm ci` to install the dependencies and `npm start` to start the app.

Before running, you'll need to configure your personal apitest.laji.fi access token. Get the key to your email:

```
curl -X POST --header "Content-Type: application/json" --header "Accept: application/json" -d "{\
  \"email\": \"<YOUR EMAIL ADDRESS>\"\
  }" "http://apitest.laji.fi/v0/api-token"
```

Copy settings template file:

```
cp properties.json.example properties.json
```

Then put the API access token you got in your email to ```properties.json```. Put also your user access token & user ID there. Google API key is needed only for using the reverse geo location for foreign locations.

Try to keep the code style consistent - ```npm run lint``` should pass without errors.

## Developing different forms ##

Start the server and navigate to the local playground http://localhost:8083?id={form_id}

### Playground query parameters ###

Option        | Default | Description
--------------|---------|-----------------------------------------------------------------------------------------------
id            | -       | Form id to use. If empty, `playground/schemas.json` will be used for form schemas.
local         | `false` | Use local schemas under `forms/` instead of fetching from apitest.laji.fi.
localFormData | `false` | Use local formData under `forms/${id}.formData.json` instead of form's `prepopulatedDocument`.
settings      | `true`  | Use local settings defined in `playground/schemas`.
lang          | `fi`    | Language of the form. Doesn't affect local forms.
readonly      | `false` | Sets the form readonly.

### Examples ###

http://localhost:8083?id=JX.519 Trip report form with empty `formData`.

http://localhost:8083?id=MHL.1&localFormData=true Line transect form with local `formData`.

## Tests ##

You need to update the webdriver before testing: 

```
webdriver-manager update
```

The playground server must be running before running the tests.

Run the tests with `npm test`.

### Test parameters ###

Parameters are given as envirnment variables, i.e. `TEST_BROWSER=chrome npm test`

Option         | Default | Description
---------------|---------|-----------------------------------------------------------------------------------------------
TEST_BROWSER   | -       | `chrome` or `firefox`. Tests are run for both by default.
HEADLESS       | `true`  | Run the tests in a visible browser window if `true`.
THREADS        | 4       | How many browser instances to use for parallel testing.
