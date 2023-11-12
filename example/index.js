
import * as pluginA from "./plugin_a/plugin.js"
import * as pluginB from "./plugin_b/plugin.js"

import architect from "../index.js"


var config = [pluginA,pluginB];

var app = architect.build(config)


app.start()