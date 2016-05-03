# README #

This is a React module, that can be installed as a npm dependency and bolted to DOM with few lines.

# Installing #

Install as a git dependency:

```
npm install git+ssh://git@bitbucket.org:luomus/laji-form.js.git --save
```

# Usage #

LajiForm is a react-jsonschema-form wrapper. It passes all the parameters to <Form />.

```
import React from "react";
import { render } from "react-dom";
import LajiForm from "laji-form";

render(<LajiForm schema={...} uiSchema={...} formData={...} />, document.getElementById("app"));
```

LajiForm API is also importable:

```
...
import { Api } from "laji-form";

let api = new Api("apikey");

```

# Development #

You need to configure your personal apitest.laji.fi access token. Get the key to you email:

```
curl -X POST --header "Content-Type: application/json" --header "Accept: application/json" -d "{\
  \"email\": \"<YOUR EMAIL ADDRESS>\"\
  }" "http://apitest.laji.fi/v0/api-token"
```

Copy settings template file

```
cp properties.json.example properties.json
```

Then write the API key you got in your email to properties.json
