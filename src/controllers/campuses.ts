import CampusModel from '../models/Campus.model';
import { Request, Response } from 'express';

// tslint:disable-next-line: no-unused-expression
const Universities = [
      // {
      //       Name: 'Adekunle Ajasin University',
      //       Abbreviation: 'AAUA',
      // },
      // {
      //       Name: 'Federal University Of Agriculture',
      //       Abbreviation: 'FUNAAB',
      // },
      // {
      //       Name: 'Abia State University',
      //       Abbreviation: ' ABSU',
      // },
      // {
      //       Name: 'Adekunle Ajasin University',
      //       Abbreviation: 'AAUA',
      // },
      // {
      //       Name: 'Joseph Ayo Babalola University',
      //       Abbreviation: 'JABU',
      // },
      // {
      //       Name: 'Redeemer/s University Nigeria',
      //       Abbreviation: ' RUN',
      // },
      {
            Name: 'Afe Babalola University',
            Abbreviation: 'ABUAD',
      },
      // {
      //       Name: 'Akwa Ibom State University',
      //       Abbreviation: 'AKSU',
      // },
      // {
      //       Name: 'American University Of Nigeria',
      //       Abbreviation: 'AUN',
      // },
      // {
      //       Name: 'Abubakar Tafawa Balewa University',
      //       Abbreviation: 'ATBU',
      // },
      // {
      //       Name: 'Adamawa State University',
      //       Abbreviation: 'ADSU',
      // },
      // {
      //       Name: 'Achievers University',
      //       Abbreviation: 'AC',
      // },
      // {
      //       Name: ' Al-Hikmah University',
      //       Abbreviation: 'AHU',
      // },
      // {
      //       Name: 'Ambrose Ali University',
      //       Abbreviation: 'AAU',
      // },
      // {
      //       Name: 'Anambra State University',
      //       Abbreviation: 'ANSU',
      // },
      // {
      //       Name: 'Ajayi Crowther University',
      //       Abbreviation: 'ACU',
      // },
      // {
      //       Name: 'Bayero University',
      //       Abbreviation: 'BUK',
      // },
      {
            Name: 'Babcock University',
            Abbreviation: 'BU',
      },
      {
            Name: 'Bells University Of Technology',
            Abbreviation: 'BUT',
      },
      // {
      //       Name: 'Benson Idahosa University Of Technology',
      //       Abbreviation: 'BIU',
      // },
      // {
      //       Name: 'Benue State University',
      //       Abbreviation: 'BSU',
      // },
      // {
      //       Name: 'ECWA Bingham University',
      //       Abbreviation: 'BU',
      // },
      // {
      //       Name: 'Bowen University ',
      //       Abbreviation: 'BU',
      // },
      // {
      //       Name: 'Bukar Abba Ibrahim University',
      //       Abbreviation: 'YSU',
      // },
      // {
      //       Name: 'Caleb University',
      //       Abbreviation: 'CUI',
      // },
      // {
      //       Name: 'Landmark University',
      //       Abbreviation: 'LU',
      // },
      // {
      //       Name: 'Nigerian Turkish Nile University',
      //       Abbreviation: ' Abbv',
      // },
      {
            Name: 'University Of Lagos',
            Abbreviation: ' UNILAG',
      },
      // {
      //       Name: 'University Of Nigeria Nsukka',
      //       Abbreviation: 'UNN',
      // },
      {
            Name: 'Convenant University',
            Abbreviation: 'CU',
      },
];

export async function Campus(): Promise < number > {
      /**
       *
       * Load campuses into DB
       * @export LoadCampuses
       * @returns {Promise<number>}
       * If 0, no error, if 1, an error occured;
       */
      // TODO: Check if campus collection exist
      try {
            const uniCheck = await CampusModel.exists({Name: 'Convenant University'});
            if (!uniCheck) {
            await CampusModel.create(Universities);
            }
            return 0;
      } catch (error) {
            return 1;
      }

}

export async function GetCampuses(req: Request, res: Response) {
      try {
            const campuses = await CampusModel.find({});
            return campuses;
      } catch (error) {
            return error;
      }
}
