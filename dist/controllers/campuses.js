"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Campus_model_1 = tslib_1.__importDefault(require("../models/Campus.model"));
const Universities = [
    {
        Name: 'Afe Babalola University',
        Abbreviation: 'ABUAD',
    },
    {
        Name: 'Babcock University',
        Abbreviation: 'BU',
    },
    {
        Name: 'Bells University Of Technology',
        Abbreviation: 'BUT',
    },
    {
        Name: 'University Of Lagos',
        Abbreviation: ' UNILAG',
    },
    {
        Name: 'Convenant University',
        Abbreviation: 'CU',
    },
];
function Campus() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const uniCheck = yield Campus_model_1.default.exists({ Name: 'Convenant University' });
            if (!uniCheck) {
                yield Campus_model_1.default.create(Universities);
            }
            return 0;
        }
        catch (error) {
            return 1;
        }
    });
}
exports.Campus = Campus;
function GetCampuses(req, res) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const campuses = yield Campus_model_1.default.find({});
            return campuses;
        }
        catch (error) {
            return error;
        }
    });
}
exports.GetCampuses = GetCampuses;
