

setup.consumes = ["hello"];
setup.provides = [];

export function setup( imports, register) {
    var { hello } = imports;

    hello.test();

    register();
}


