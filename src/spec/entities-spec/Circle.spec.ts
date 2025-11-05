/**
 * Circle Entity Tests
 * Migrated to Bun test runner
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Circle } from "../../entities/Circles/Circle";
import { CirclePost } from "../../entities/Circles/CirclePost";
import { ICircle } from "../../interfaces/ICircle";
import { ICirclePost } from "../../interfaces/ICirclePost";
import CircleModel from "../../models/Circle.model";
import CircleMemberModel from "../../models/CircleMember.model";
import CirclePostModel from "../../models/CirclePost.model";
import faker from "faker";
import {
  setupTestDB,
  clearTestDB,
  teardownTestDB,
  setupTestRedis,
  teardownTestRedis,
  createTestUser,
} from "../utils";

describe("Circle Entity", () => {
  let testRedis: any;
  let testUser: any;
  let testCircle: any;
  let testMember: any;

  beforeAll(async () => {
    await setupTestDB();
    testRedis = setupTestRedis();
    // Create a test user for all circle operations
    testUser = await createTestUser();
  });

  afterAll(async () => {
    await teardownTestDB();
    await teardownTestRedis();
  });

  beforeEach(async () => {
    // Keep user between tests but clear circles
    await CircleModel.deleteMany({});
    await CircleMemberModel.deleteMany({});
    await CirclePostModel.deleteMany({});
  });

  test("should create a circle", async () => {
    const circleObject: ICircle = {
      description: faker.lorem.words(5),
      name: faker.company.companyName(),
      category: "food",
    };

    const result = await Circle.Create(circleObject, testUser.user._id);
    expect(result).toBeDefined();
    expect(result.exist).toBe(false);
    expect(result.converted).toBeDefined();

    // Verify circle was created in DB (name is stored lowercase)
    const circle = await CircleModel.findOne({ name: circleObject.name.toLowerCase() });
    expect(circle).toBeDefined();
    expect(circle?.name).toBe(circleObject.name.toLowerCase());
    expect(circle?.description).toBe(circleObject.description);
  });

  test("should join a circle", async () => {
    // Create a circle first
    const circleObject: ICircle = {
      description: faker.lorem.words(5),
      name: faker.company.companyName(),
      category: "food",
    };
    const createResult = await Circle.Create(circleObject, testUser.user._id);

    // Circle.Create auto-joins the creator, so we need a second user
    const secondUser = await createTestUser();

    // Second user joins the circle
    const result = await Circle.Join(secondUser.user._id, createResult.converted._id.toString());

    expect(result).toBeDefined();
    expect(result.memberID).toBeDefined();
    expect(typeof result.memberID).toBe("string");

    // Verify membership in DB
    const member = await CircleMemberModel.findOne({
      circle: createResult.converted._id,
      userID: secondUser.user._id,
    });
    expect(member).toBeDefined();
  });

  test("should get circles", async () => {
    // Create multiple circles
    await Circle.Create(
      { name: faker.company.companyName(), description: faker.lorem.words(5), category: "food" },
      testUser.user._id
    );
    await Circle.Create(
      { name: faker.company.companyName(), description: faker.lorem.words(5), category: "tech" },
      testUser.user._id
    );

    const result = await Circle.GetCircles(0, testUser.user._id, false, testRedis);

    expect(result).toBeDefined();
    expect(result.circles).toBeDefined();
    expect(Array.isArray(result.circles)).toBe(true);
    expect(result.circles.length).toBeGreaterThan(0);
  });

  test("should get circles in a specific category", async () => {
    // Create circles in different categories
    await Circle.Create(
      { name: "Food Circle", description: faker.lorem.words(5), category: "food" },
      testUser.user._id
    );
    await Circle.Create(
      { name: "Tech Circle", description: faker.lorem.words(5), category: "tech" },
      testUser.user._id
    );

    const result = await Circle.GetCircles(0, testUser.user._id, false, testRedis, "food");

    expect(result).toBeDefined();
    expect(result.circles).toBeDefined();
    expect(Array.isArray(result.circles)).toBe(true);
    expect(result.circles.length).toBeGreaterThan(0);
    // All circles should be in food category
    result.circles.forEach((circle: any) => {
      expect(circle.category).toBe("food");
    });
  });

  describe("Circle Post Feed", () => {
    beforeEach(async () => {
      // Create circle (auto-joins creator as member)
      const circleObject: ICircle = {
        description: faker.lorem.words(5),
        name: faker.company.companyName(),
        category: "food",
      };
      const createResult = await Circle.Create(circleObject, testUser.user._id);
      testCircle = createResult.converted;

      // Get the member ID for the creator
      testMember = await CircleMemberModel.findOne({
        circle: testCircle._id,
        userID: testUser.user._id,
      });
    });

    test("should create circle post", async () => {
      const circlePost: ICirclePost = {
        campus: faker.company.companyName(),
        circleID: testCircle._id,
        memberID: testMember._id,
        author: testUser.user._id,
        text: faker.lorem.sentences(2),
        parentPost: "",
      };

      await CirclePost.CirclePost(circlePost, undefined, testRedis);

      // Verify post was created
      const post = await CirclePostModel.findOne({ text: circlePost.text });
      expect(post).toBeDefined();
      expect(post?.text).toBe(circlePost.text);
      expect(post?.circleID.toString()).toBe(testCircle._id.toString());
    });

    test("should get feed from circle", async () => {
      // Create a post first
      const circlePost: ICirclePost = {
        campus: faker.company.companyName(),
        circleID: testCircle._id,
        memberID: testMember._id,
        author: testUser.user._id,
        text: faker.lorem.sentences(2),
        parentPost: "",
      };
      await CirclePost.CirclePost(circlePost, undefined, testRedis);

      // Get circle feed
      const result = await Circle.GetCircleFeed(testCircle._id, testUser.user._id, 1, 10);

      expect(result).toBeDefined();
      expect(result.circleFeed).toBeDefined();
      expect(Array.isArray(result.circleFeed)).toBe(true);
      expect(result.circleFeed.length).toBeGreaterThan(0);
    });

    // TODO: Uncomment when Firebase is properly mocked
    // test("should like a circle post", async () => {
    //   const post = await CirclePostModel.findOne({});
    //   const result = await CirclePost.LikePost(testUser.user._id, post._id, "circlePost");
    //   expect(result).toBeDefined();
    // });

    // test("should comment on a circle post", async () => {
    //   // Test implementation
    // });

    // test("should get comments of a circle post", async () => {
    //   // Test implementation
    // });
  });

  // TODO: Implement when needed
  // test("should leave circle", async () => {
  //   const circle = await CircleModel.findOne({});
  //   const result = await Circle.Leave(circle._id.toString(), testUser.user._id);
  //   expect(result).toBeDefined();
  // });
});
