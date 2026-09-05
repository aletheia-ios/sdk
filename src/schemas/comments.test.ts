import { expect, test } from "vitest";
import { Comment } from "./comments";

const LEAF = {
  id: "2",
  author: { name: "b", avatar: null, profileURL: null },
  body: [{ kind: "spoiler", segments: [{ kind: "text", text: "x" }] }],
  postedDate: 2,
  likes: 0,
  dislikes: null,
  replyCount: 0,
  replies: [],
  isPinned: false,
  isEdited: false,
  isRemoved: false,
};

test("comments recurse through replies and spoiler segments", () => {
  // arrange
  const comment = { ...LEAF, id: "1", replies: [LEAF] };

  // act
  const result = Comment.safeParse(comment);

  // assert
  expect(result.success).toBe(true);
});
