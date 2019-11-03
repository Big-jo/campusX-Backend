"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importStar(require("mongoose"));
const CampusSchema = new mongoose_1.Schema({
    Name: { type: String },
    Abbreviation: { type: String },
});
exports.default = mongoose_1.default.model('Campus', CampusSchema);
