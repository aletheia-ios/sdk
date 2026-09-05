import { z } from "zod";
import { epochMs } from "./scalars";

/** One piece of a comment body. Written by hand because the type is recursive through `spoiler`. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "spoiler"; segments: Segment[] };

/** Validates a `Segment`. Lazy, because a spoiler contains segments. */
export const Segment: z.ZodType<Segment> = z
  .lazy(() =>
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("text"), text: z.string() }),
      z.object({ kind: z.literal("image"), url: z.url() }),
      z.object({ kind: z.literal("video"), url: z.url() }),
      z.object({ kind: z.literal("spoiler"), segments: z.array(Segment) }),
    ]),
  )
  .meta({
    description:
      'One piece of a comment body. "video" exists because reaction embeds are routinely mp4 rather than gif; "spoiler" wraps either text or an attachment.',
  });

/** Validates a `CommentAuthor`. */
export const CommentAuthor = z.object({
  name: z.string().meta({ description: 'Display name, or a placeholder such as "Deleted User".' }),
  avatar: z.url().nullable(),
  profileURL: z.url().nullable(),
});

/** Validates a `Comment`. Recursive through `replies`, hence the getter. */
export const Comment = z
  .object({
    id: z.string().min(1),
    author: CommentAuthor,
    body: z.array(Segment),
    postedDate: epochMs.meta({
      description:
        'Approximate where the source publishes only "8mos ago". Never render more precisely than the source stated.',
    }),
    likes: z.int().nullable(),
    dislikes: z.int().nullable(),
    replyCount: z.int().nonnegative().meta({
      description:
        'The source\'s own total. Routinely exceeds `replies.length`; the difference is what the UI offers as "n more".',
    }),
    get replies(): z.ZodArray<typeof Comment> {
      return z.array(Comment);
    },
    isPinned: z.boolean(),
    isEdited: z.boolean(),
    isRemoved: z.boolean(),
  })
  .meta({ description: "One comment, with whatever replies arrived alongside it." });

/** Validates a `CommentPage` returned by `comments`. */
export const CommentPage = z
  .object({
    items: z.array(Comment),
    next: z.string().nullable().meta({
      description:
        "Opaque. A page number, a keyset cursor, a full URL - the source's choice. Handed back untouched.",
    }),
    threadURL: z
      .url()
      .nullable()
      .meta({ description: "Where the reader can open this thread in a browser." }),
  })
  .meta({
    description:
      'One page of a chapter\'s discussion. An empty `items` means the thread is empty; a source that cannot fetch it throws instead, so "empty" and "failed" never render alike.',
  });
