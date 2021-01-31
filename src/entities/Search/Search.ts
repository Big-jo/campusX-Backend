import PostModel from '../../models/Post.model';
import UserModel from '../../models/User.model';
import CircleModel from '../../models/Circle.model';
import CirclePostModel from '../../models/CirclePost.model';
import {IUser} from '../../interfaces/IUser';

// enum UserCriteria {
//     name = 'name',
//     campus = 'campus',
//     userTag = 'userTag',
// }

export class Search {
    private term: string;

    constructor(term: string) {
        this.term = term;
    }

    public async PostSearch() {
        try {
            return await PostModel.find({$text: {$search: this.term}}).exec();
        } catch (e) {
            throw new Error(e);
        }
    }

    public async UserSearch(searchCriteria: string): Promise<IUser[]> {
        try {
            const projections = {
                password: 0,
                email: 0,
                'userProfile.visits': 0,
            };
            switch (searchCriteria) {
                case 'name':
                    return await UserModel.find({$text: {$search: this.term}}, projections).exec();
                case 'userTag':
                    return await UserModel.find({$text: {$search: this.term}}, projections).exec();
                case 'campus':
                    return await UserModel.find({'userProfile.university': this.term}, projections).exec();
                default:
                    return await UserModel.find({name: this.term}, projections).exec();
            }
        } catch (e) {
            throw new Error(e);
        }

    }

    public async CircleSearch() {
        try {
            return await CircleModel.find({$text: {$search: this.term}}).exec();
        } catch (e) {
            throw new Error(e);
        }
    }

    public async CirclePostSearch() {
        try {
            return await CirclePostModel.find({$text: {$search: this.term}}).exec();
        } catch (e) {
            throw new Error(e);
        }
    }
}
