import fs from 'fs';
// tslint:disable-next-line: no-var-requires
const kye = require('keyword-extractor');
import _ from 'lodash';
import performance from 'perf_hooks';
import postModel from '../models/Post.model';
import { IPost } from 'src/interfaces/IPost';

type Extracted = Array<{
    keywords: string[];
    campus: string;
}>;

interface IRecord {
    [x: string]: {
        keyword: string;
        campus: string;
        count: number;
    };
}

export class Trend {

    // private wordMap: { keyword: string, campus: string, count: number };
    public posts: any;

    constructor(posts: any) {
        this.posts = posts;
    }

    private ExtractKeywords(posts: Array<{ text: string, campus: string }>): Extracted {
        const extracted: Extracted = [];

        //  Extract Keywords
        for (let index = 0; index < posts.length; index++) {
            const post = posts[index].text;
            const campus = posts[index].campus;

            const keywords = kye.extract(post);
            extracted.push({ keywords, campus });
        }
        return extracted;
    }

    /**
     *
     *
     * @param {Extracted} Data
     * @returns
     * @memberof Trend
     */
    private CalulateTrend(Data: Extracted): IRecord {

        // Keeps track of keywords and their count
        const record: IRecord = {};

        for (let index = 0; index < Data.length; index++) {
            const data = Data[index];

            data.keywords.forEach(keyword => {
                // check if keyword is in record
                if (record.hasOwnProperty(keyword)) {
                    // increment count in the record
                    record[keyword].count++;
                } else {
                    // create keyword in the record
                    record[keyword] = { keyword, count: 1, campus: data.campus };
                }
            });
        }

        return record;
    }

    private SortTrend(trend: IRecord) {
        return _.chain(trend).orderBy(t => t.count, ['desc']).groupBy(t => t.campus).value();
    }

    public GenerateTrend() {
        const extracted = this.ExtractKeywords(this.posts);
        const trend = this.CalulateTrend(extracted);
        const sorted = this.SortTrend(trend);

        return sorted;
    }
}

// diagnostics

// const postData = JSON.parse(fs.readFileSync(`${__dirname}/test-articles.json`, {
//     encoding: 'utf8',
// }));

// const trend = new Trend(postData);

// console.log(trend);
