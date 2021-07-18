import mongoose from "mongoose";
import { expect } from "chai";
import { describe } from "mocha";
import { User } from "../../entities/User";
import { IUser } from "../../interfaces";
import UserModel from "../../models/User.model";
import { logger } from "../../shared";
import faker from "faker";
import IORedis from "ioredis";
import { GetUsers, GetUserID, GenerateUsers } from "./util";
const Db = mongoose.connection;
let primaryCache: IORedis.Redis;

describe("User Methods", function() {
  this.timeout(5000);
  before(() => {
    const URI = process.env.MONGO_URI as string;
    mongoose.connect(URI, {
      useNewUrlParser: true,
      useFindAndModify: false,
    });
    // tslint:disable-next-line: no-console
    Db.on("error", console.error.bind(console, "MongoDB connection error"));
    // tslint:disable-next-line: no-console
    Db.on("connected", console.log.bind(console, "MongoDB connected"));

    primaryCache = new IORedis();

    primaryCache.on("connect", () => {
      logger.info("Redis Connected");
    });

    primaryCache.on("error", (err) => {
      logger.error(err);
      throw new Error(err.message);
    });

    return Db.dropCollection("follows")
      .then(() => {
        console.log("dropped");
      })
      .catch((e) => {
        console.log(e);
      });
  });

  after(() => {
    primaryCache.quit();

    return mongoose.disconnect().then(() => {
      console.log("Disconnected");
    });
  });

  it("Should create  2 users and return user details", () => {
    const user = [
      {
        name: `${faker.name.firstName(1)} ${faker.name.lastName(1)}`,
        userTag: faker.internet.userName(),
        email: faker.internet.email(),
        password: "111",
        userProfile: {
          bio: faker.lorem.sentence(10),
          gender: "male",
          university: "Bells University Of Technology",
          avatar: "https://picsum.photos/200/300",
        },
      },
    ] as IUser[];

    return User.CreateUser(user[0])
      .then((result) => {
        expect(result).to.be.an("object");
        expect(result.token).to.be.a("string");
        expect(result.user).to.be.an("object");
        expect(result.user).to.have.property("avatar");
        expect(result.user).to.have.property("userID");
        expect(result.user).to.have.property("userTag");
      })
      .catch();
  });

  it("should return a users token and some other information", async () => {
    // GenerateNewUsers(10);
    const doc = await GenerateUsers(1);

    const result = await User.Login(doc[0][0].email, "111");
    expect(result).to.be.an("object");
    expect(result.token).to.be.a("string");
    expect(result.user).to.be.an("object");
    expect(result.user).to.have.property("avatar");
    expect(result.user).to.have.property("userID");
    expect(result.user).to.have.property("userTag");
    expect(result.user).to.have.property("university");
  });

  it("should follow a user", async () => {
    const r = await User.FollowUser(
      (await GetUserID())[1],
      (await GetUserID())[0],
      primaryCache,
    );
    expect(r).to.not.have.property("error");
  });

  it("should get a user info with self search key", async () => {
    const result = await User.GetUser(
      "self",
      (await GetUserID())[1],
      (await GetUserID())[0],
    );
    expect(result.self).to.have.property("name");
    expect(result.self).to.have.property("userProfile");
    expect(result.self).to.have.property("userTag");
    expect(result.self.userProfile).to.have.property("avatar");
  });

  it("should get another users info with the user key", async () => {
    const result = await User.GetUser(
      "user",
      (await GetUserID())[1],
      (await GetUserID())[0],
    );
    expect(result.user).to.have.property("name");
    expect(result.user).to.have.property("userProfile");
    expect(result.user).to.have.property("userTag");
    expect(result.user.userProfile).to.have.property("avatar");
    expect(result.user.userProfile).to.have.property("bio");
    expect(result.user.userProfile).to.have.property("gender");
    expect(result.user.userProfile).to.have.property("university");
    expect(result).to.have.property("isFollowing");
    expect(result.isFollowing).to.be.a("boolean");
  });

  it("should return users and show if they are in the same campus", async () => {
    const result = await User.ConnectUser(
      (await GetUserID())[1],
      "sameCampus",
      "Bells University Of Technology",
      null,
    );
    expect(result).to.have.property("connectUsers");
    expect(result.connectUsers).to.be.an("array");
    expect(result.connectUsers.length).to.be.greaterThan(0);
  });
});
