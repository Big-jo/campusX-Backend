"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Server_1 = tslib_1.__importDefault(require("./Server"));
const Logger_1 = require("./shared/Logger");
const port = Number(process.env.PORT || 3000);
Server_1.default.listen(port, () => {
    Logger_1.logger.info('Express server started on port: ' + port);
});
exports.default = Server_1.default;
