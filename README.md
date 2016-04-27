# README #

This is a React module, that can be installed as a npm dependency and bolted to DOM with few lines.

# Installing #

Install as a git dependency:

```
npm install git+ssh://git@bitbucket.org:luomus/laji-form.js.git --save
```

# Usage #

LajiFormApp offers a HTML select filled with laji forms. Selecting an options updates the LajiForm component accordingly. You'll need an api key for apitest.laji.fi (see the development section).

```
import React from "react";
import { render } from "react-dom";
import LajiFormApp from "laji-form";

render(<LajiFormApp apiKey="apiKey" />, document.getElementById("app"));
```

You can also use directly the LajiForm component like so:

```
...
import { LajiForm } from "laji-form";

render(<LajiForm formId="id" data={formData} apiKey="apiKey" />, document.getElementById("app"));
```

# Development #

You need to configure your personal apitest.laji.fi access token. Get the key to you email:

```
curl -X POST --header "Content-Type: application/json" --header "Accept: application/json" -d "{\
  \"email\": \"<YOUR EMAIL ADDRESS>\"\
  }" "http://apitest.laji.fi/v0/api-token"
```

Copy settings template file:

```
cp properties.json.example properties.json
```

Then write the API key you got in your email to ```properties.json```.