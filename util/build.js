const fs = require('fs-extra');
const childProcess = require('child_process');


// remove current build, and create new one
fs.removeSync('./dist/');


// transpile the typescript files
childProcess.exec('tsc --build tsconfig.prod.json', (error, stdout, stderr) => {
    if(error) console.error(error.message);
    console.error(stderr);
    console.log(stdout);
});
