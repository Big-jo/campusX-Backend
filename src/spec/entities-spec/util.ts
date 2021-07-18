import faker from 'faker';
import {User} from '../../entities/User';
import UserModel from '../../models/User.model';
import {IPost} from '../../interfaces';
import PostModel from 'src/models/Post.model';

import {IUser} from '../../interfaces';

export async function GetUserID() {
  // Main User
  const users = await UserModel.find().sort({ _id: 1 }).exec();
  return users[0]._id;
}

export function GenerateUsers(quantity: number) {
  let x = 0;

  while (quantity > x) {
    const user = {
      name: `${faker.name.firstName(1)} ${faker.name.lastName(1)}`,
      userTag: faker.internet.userName(),
      email: faker.internet.email(),
      password: "111",
      userProfile: {
        bio: faker.lorem.sentence(10),
        gender: "male",
        university: faker.company.companyName(),
        avatar: "https://picsum.photos/200/300",
        department: '',
      },

    } as IUser;
    User.CreateUser(user)
      .then((r: any) => {
        console.log(
          quantity > 1 ? `${quantity} user's created` : `${quantity} user created`,
        );
        return user;
      })
      .catch((e: any) => {
        console.log(e);
      });
    x++;
  }
}

export async function GetUsers(numberOfUsers: number) {
  let x = 0;
  const generated = [];
  while (x < numberOfUsers) {
    generated.push(await UserModel.find().limit(1).exec());
    x++;
  }
  return generated;
}

export async function GeneratePost(quantity: number) {
  let x = 0;
  const generated = [];
  while (x < quantity) {
    generated.push({
      campus: faker.company.companyName(),
      author: (await GetUserID()).toString(),
      text: faker.lorem.sentences(10),
    } as IPost);
    x++;
  }
  return generated;
}

export async function GetPosts() {
  return await PostModel.find().sort({_id: 1}).lean().exec();
}
// async function GetCircle() {
//   let circle;
//   circle = await CircleModel.findOne({}).limit(1).sort({ $natural: -1 }).exec();
//   return circle._id;
// }

// async function GetMemberID() {
//   let memberID;
//   memberID = await CircleMemberModel.findOne({
//     circle: await GetCircle(),
//     userID: user01,
//   }).exec();
//   return memberID._id;
// }

// async function GetCirclePost() {
//   let postID;
//   postID = await CirclePostModel.findOne({
//     circleID: await GetCircle(),
//     userID: user01,
//   }).exec();
//   return postID._id;
// }
