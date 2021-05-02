process.env.TS_NODE_PROJECT = './src/tsconfig.json';

import Mocha from 'mocha';
import fs from 'fs';
import path from 'path';

const mocha = new Mocha({
    ui: 'tdd',
    reporter: 'list',
});

const testDir = './spec/entities-spec';

fs.readdirSync(testDir).forEach(file => {
    mocha.addFile(path.join(testDir, file));
});

mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;
});

