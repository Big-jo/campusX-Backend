"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Campus_model_1 = tslib_1.__importDefault(require("../models/Campus.model"));
const Universities = [{
        Name: 'Adekunle Ajasin University',
        Abbreviation: 'AAUA',
    },
    {
        Name: 'Federal University Of Agriculture',
        Abbreviation: 'FUNAAB',
    },
    {
        Name: 'Abia State University',
        Abbreviation: ' ABSU',
    },
    {
        Name: 'Adekunle Ajasin University',
        Abbreviation: 'AAUA',
    },
    {
        Name: 'Joseph Ayo Babalola University',
        Abbreviation: 'JABU',
    },
    {
        Name: 'Redeemer/s University Nigeria',
        Abbreviation: ' RUN',
    },
    {
        Name: 'Afe Babalola University',
        Abbreviation: 'ABUAD',
    },
    {
        Name: 'Akwa Ibom State University',
        Abbreviation: 'AKSU',
    },
    {
        Name: 'American University Of Nigeria',
        Abbreviation: 'AUN',
    },
    {
        Name: 'Abubakar Tafawa Balewa University',
        Abbreviation: 'ATBU',
    },
    {
        Name: 'Adamawa State University',
        Abbreviation: 'ADSU',
    },
    {
        Name: 'Achievers University',
        Abbreviation: 'AC',
    },
    {
        Name: ' Al-Hikmah University',
        Abbreviation: 'AHU',
    },
    {
        Name: 'Ambrose Ali University',
        Abbreviation: 'AAU',
    },
    {
        Name: 'Anambra State University',
        Abbreviation: 'ANSU',
    },
    {
        Name: 'Ajayi Crowther University',
        Abbreviation: 'ACU',
    },
    {
        Name: 'Bayero University',
        Abbreviation: 'BUK',
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
        Name: 'Benson Idahosa University Of Technology',
        Abbreviation: 'BIU',
    },
    {
        Name: 'Benue State University',
        Abbreviation: 'BSU',
    },
    {
        Name: 'ECWA Bingham University',
        Abbreviation: 'BU',
    },
    {
        Name: 'Bowen University ',
        Abbreviation: 'BU',
    },
    {
        Name: 'Bukar Abba Ibrahim University',
        Abbreviation: 'YSU',
    },
    {
        Name: 'Caleb University',
        Abbreviation: 'CUI',
    },
    {
        Name: 'Landmark University',
        Abbreviation: 'LU',
    },
    {
        Name: 'Nigerian Turkish Nile University',
        Abbreviation: ' Abbv',
    },
    {
        Name: 'University Of Lagos',
        Abbreviation: ' UNILAG',
    },
    {
        Name: 'University Of Nigeria Nsukka',
        Abbreviation: 'UNN',
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
