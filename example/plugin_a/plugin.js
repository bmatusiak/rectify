
export const consumes = ["hello"];

export const provides = [];


export function setup(plugin, imports, register) {
    var { hello } = imports;

    hello.test();

    register();
}


