// import events from "events";
const events = require("events");
const EventEmitter = events.EventEmitter;

function objHas(obj, name) { return Object.prototype.hasOwnProperty.call(obj, name); }

// Check a plugin config list for bad dependencies and throw on error
function checkConfig(config) {

    // Check for the required fields in each plugin.
    config.forEach(function (plugin) {
        if (plugin.checked) { return; }

        if (!objHas(plugin, "setup") && typeof plugin == "function")
            plugin.setup = plugin;

        if (!objHas(plugin, "setup") && typeof plugin.default == "function")
            plugin.setup = plugin.default;

        if (!objHas(plugin, "setup")) {
            throw new Error("Plugin is missing the setup function " + JSON.stringify(plugin));
        }
        if (!objHas(plugin, "provides")) {
            if (objHas(plugin.setup, "provides")) {
                plugin.provides = plugin.setup.provides;
            } else
                throw new Error("Plugin is missing the provides array " + JSON.stringify(plugin));
        }
        if (!objHas(plugin, "consumes")) {
            if (objHas(plugin.setup, "consumes")) {
                plugin.consumes = plugin.setup.consumes;
            } else
                throw new Error("Plugin is missing the consumes array " + JSON.stringify(plugin));
        }
    });

    return checkCycles(config);
}

function checkCycles(config) {
    var plugins = [];
    config.forEach(function (pluginConfig, index) {
        plugins.push({
            packagePath: pluginConfig.packagePath,
            provides: pluginConfig.provides.concat(),
            consumes: pluginConfig.consumes.concat(),
            i: index
        });
    });

    var resolved = {
        app: true
    };
    var changed = true;
    var sorted = [];

    while (plugins.length && changed) {
        changed = false;

        plugins.concat().forEach(function (plugin) {
            var consumes = plugin.consumes.concat();

            var resolvedAll = true;
            for (var i = 0; i < consumes.length; i++) {
                var service = consumes[i];
                if (!resolved[service]) {
                    resolvedAll = false;
                } else {
                    plugin.consumes.splice(plugin.consumes.indexOf(service), 1);
                }
            }

            if (!resolvedAll)
                return;

            plugins.splice(plugins.indexOf(plugin), 1);
            plugin.provides.forEach(function (service) {
                resolved[service] = true;
            });
            sorted.push(config[plugin.i]);
            changed = true;
        });
    }

    if (plugins.length) {
        var unresolved = {};
        plugins.forEach(function (plugin) {
            delete plugin.config;
            plugin.consumes.forEach(function (name) {
                if (unresolved[name] == false)
                    return;
                if (!unresolved[name])
                    unresolved[name] = [];
                unresolved[name].push(plugin.packagePath);
            });
            plugin.provides.forEach(function (name) {
                unresolved[name] = false;
            });
        });

        Object.keys(unresolved).forEach(function (name) {
            if (unresolved[name] == false)
                delete unresolved[name];
        });

        console.error("Could not resolve dependencies of these plugins:", plugins);
        console.error("Resolved services:", Object.keys(resolved));
        console.error("Missing services:", unresolved);
        throw new Error("Could not resolve dependencies");
    }

    return sorted;
}

class Rectify extends EventEmitter {
    constructor(config, appArg) {
        super();//setup emitter
        var app = this;
        app.config = config;
        var services = app.services = {
            app: {
                EventEmitter: EventEmitter,
                isNode: Rectify.isNode,
                isFork: Rectify.isFork,
                isNWJS: Rectify.isNWJS,
                isWorker: Rectify.isWorker,
                window: typeof window == "undefined" ? global : window,
                on: function (name, callback) {
                    if (typeof (callback) == "function") callback = callback.bind(app);
                    app.on.apply(app, [name, callback]);
                },
                once: function (name, callback) {
                    if (typeof (callback) == "function") callback = callback.bind(app);
                    app.once.apply(app, [name, callback]);
                },
                emit: function () {
                    app.emit.apply(app, arguments);
                },
                get services() {
                    return app.services;
                }
            }
        };
        if (appArg && typeof appArg == "object")
            for (var i in appArg) {
                services.app[i] = appArg[i];
            }
        else
            services.app.arg = appArg;

        // Check the config
        var sortedPlugins = checkConfig(config);

        var destructors = [];

        app.start = async function (event, callback) {
            if (typeof event == "function") {
                callback = event;
                event = null;
            }
            if (event) app.$ = event;
            if (callback) app.on("ready", callback);
            var plugin = sortedPlugins.shift();
            if (!plugin) {
                services.app.emit(app.$, app);
                return app.emit("ready", app);
            }
            var imports = {};
            if (plugin.consumes) {
                plugin.consumes.forEach(function (name) {
                    imports[name] = services[name];
                });
            }

            var $config = {};
            plugin.provides.forEach(function (name) {
                if (plugin.config && plugin.config[name]) {
                    $config[name] = plugin.config[name];
                } else $config[name] = {};
                var $c = config.config && config.config[name] ? config.config[name] : {};
                for (var i in $c) {
                    $config[name][i] = $c[i];
                }
            });

            try {
                await plugin.setup(imports, register, $config);
                return app;
            } catch (e) {
                return app.emit("error", e);
            }

            async function register(err, provided) {
                if (err) { return app.emit("error", err); }
                plugin.provides.forEach(function (name) {
                    if (!objHas(provided, name)) {
                        var err = new Error("Plugin failed to provide " + name + " service. " + JSON.stringify(plugin));
                        return app.emit("error", err);
                    }
                    services[name] = provided[name];

                    // if (typeof provided[name] != "function")
                    //     provided[name].name = name;

                    app.emit("service", name, services[name]);
                });
                if (provided && objHas(provided, "onDestroy"))
                    destructors.push(provided.onDestroy);

                app.emit("plugin", plugin);
                await app.start();
            }
        };

        // Give createApp some time to subscribe to our "ready" event
        // (typeof process === "object" ? process.nextTick : setTimeout)(app.start);
    }
}

if (typeof process !== "undefined") {
    const browserLike = process.__nwjs || process.versions.electron;
    Rectify.isBrowser = (typeof window != "undefined" && typeof window.document != "undefined") ? 1 : 0;
    Rectify.isNode = (typeof process != "undefined" && !browserLike ? 1 : 0);
    Rectify.isFork = (typeof process != "undefined" && process.send ? 1 : 0);
    Rectify.isNWJS = (typeof process != "undefined" && process.__nwjs ? 1 : 0);
    Rectify.isElectron = (typeof process != "undefined" && process.versions.electron ? 1 : 0);
    Rectify.isWorker = (typeof WorkerGlobalScope != "undefined" && globalThis instanceof WorkerGlobalScope) ? 1 : 0;
} else {
    Rectify.isBrowser = (typeof window != "undefined" && typeof window.document != "undefined") ? 1 : 0;
    Rectify.isNode = 0;
    Rectify.isFork = 0;
    Rectify.isNWJS = 0;
    Rectify.isElectron = 0;
    Rectify.isWorker = (typeof WorkerGlobalScope != "undefined" && globalThis instanceof WorkerGlobalScope) ? 1 : 0;
}
Rectify.build = function (config, callback) {
    var app;
    try {
        app = new Rectify(config, callback && typeof callback == "object" ? callback : null);
    } catch (err) {
        if (!callback || !(typeof callback == "function")) throw err;
        return callback(err, app);
    }
    if (callback) {
        app.on("error", done);
        app.on("ready", onReady);
    }
    return app;

    function onReady() {
        done();
    }

    function done(err) {
        if (err) {
            console.error(err);
            app.emit('destroy');
        }
        app.removeListener("error", done);
        app.removeListener("ready", onReady);
        if (callback && (typeof callback == "function"))
            callback(err, app);
    }
};

module.exports = Rectify;
