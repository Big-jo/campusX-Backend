import { ICircle } from 'src/interfaces/ICircle';
import CircleModel from 'src/models/Circle.model';
import { logger } from '@shared';
import CircleMemberModel from 'src/models/CircleMember.model';

export class Circle {
    constructor() {
        
    }

    public static async Create(circleObject: ICircle) {
        try {
            const circleName = circleObject.name.toLowerCase();
            const circle = await CircleModel.find({name: circleName}).exec();
            if (circle) {
            return {exist: true};
        } else {
            const newCircle = new CircleModel({
                name: circleObject.name,
                avatar: circleObject.avatar,
                description: circleObject.description,
            });
            await newCircle.save();
            return 0;
        }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    } 

    public static async Join(userID: string) {
        try {
            const member = await CircleMemberModel.findOne({userID}).exec();
            if (member) {
                return {exist: true};
            } else {
                const newMember = new CircleMemberModel({userID});
                newMember.save();
                return {memberID: newMember._id};
            }
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    public static async LeaveCircle(memberID: string) {
        try {
            await CircleMemberModel.findByIdAndDelete(memberID).exec();
            return 0;
        } catch (error) {
            logger.error(error);
            throw new Error(error);
        }
    }

    /******************************************************************************
    *                                 Utility Function
    /******************************************************************************/
}
