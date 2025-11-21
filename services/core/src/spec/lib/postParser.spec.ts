/**
 * PostParser Library Tests
 * Tests mention and hashtag extraction from post text
 */

import { describe, test, expect } from "@jest/globals";
import { PostParser } from "../../lib/postParser";
import { IPost } from "../../interfaces/IPost";

describe("PostParser", () => {
  describe("Parse - Mention and Hashtag Extraction", () => {
    test("should extract mentions and hashtags from text", async () => {
      const parser = new PostParser({
        text: "Check out @alice's post about #technology and #innovation!",
        author: "user123",
      } as IPost);

      const result = await parser.Parse();

      expect(result!.mentionedUsers.mentionedUsers).toContain("@alice");
      expect(result!.mentionedUsers.count).toBe(1);
      expect(result!.hashTags.hashTags).toContain("#technology");
      expect(result!.hashTags.hashTags).toContain("#innovation");
      expect(result!.hashTags.count).toBe(2);
    });

    test("should handle empty text", async () => {
      const parser = new PostParser({
        text: "",
        author: "user123",
      } as IPost);

      const result = await parser.Parse();

      expect(result!.mentionedUsers.count).toBe(0);
      expect(result!.hashTags.count).toBe(0);
    });

    test("should handle complex text with emojis, numbers, and line breaks", async () => {
      const parser = new PostParser({
        text: "🎉 Event update!\n@organizer #event2024 #success\n@user_name thanks!",
        author: "user123",
      } as IPost);

      const result = await parser.Parse();

      expect(result!.mentionedUsers.count).toBeGreaterThan(0);
      expect(result!.hashTags.count).toBeGreaterThan(0);
    });
  });
});
