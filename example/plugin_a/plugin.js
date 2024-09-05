

plugin.consumes = ["hello"];
plugin.provides = [];

function plugin( imports, register) {
    var { hello } = imports;

    hello.test();

    register();
}


module.exports = plugin;
