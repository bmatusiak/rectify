import pluginA from "./plugin_a/plugin.js"
import pluginB from "./plugin_b/plugin.js"

import rectify from "../index.js"

(async function (){
        
    var config = [
        pluginA,
        pluginB
    ];

    var app = rectify.build(config)

    var main = await app.start();

    //main.app.services
})();