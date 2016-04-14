# README #

This is a React module, that can be installed as a npm dependency and bolted to DOM with few lines.

# Installing #

Install as a git dependency:

```
npm install git+ssh:git@bitbucket.org:luomus/laji-form.js.git --save 
```

# Usage #

```
import React from "react";
import { render } from "react-dom";
import LajiFormApp from "laji-form";

render(<LajiFormApp />, document.getElementById("app"));
```