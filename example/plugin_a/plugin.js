
export const consumes = ["hello"];

export const provides = [];


export function setup( imports, register) {
    var { hello } = imports;

    hello.test();

    register();
}


