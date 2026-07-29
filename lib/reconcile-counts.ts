import { prisma } from '@/lib/prisma'

/**
 * Reconciles the denormalised likesCount / commentsCount columns against the
 * real relation rows, for both the creator-post feed and campaign posts.
 *
 * WHY THIS EXISTS
 * ---------------
 * likesCount and commentsCount are denormalised: the like/comment routes keep
 * them in step with the underlying rows. A bug, a crash between two writes, or
 * a delete path that adjusts the count wrongly (e.g. removing a comment that
 * had replies) makes the column drift from reality — and nothing corrects it,
 * so the drift is permanent. This job recomputes the truth and heals it.
 *
 * At ~1,000 members the row counts are tiny, so a nightly full recompute is
 * cheap. It touches only the rows that are actually wrong, and reports them so
 * persistent drift (i.e. a still-buggy write path) is visible rather than
 * silently papered over each night.
 *
 * DEFINITION OF TRUTH
 *   likesCount    = number of like rows for the post
 *   commentsCount = number of NON-deleted comments (isDeleted = false),
 *                   replies included (a reply is a comment)
 */

export type ReconcileReport = {
  creatorPosts: { checked: number; corrected: number }
  campaignPosts: { checked: number; corrected: number }
}

// Turn a prisma groupBy result into a postId -> count map.
function toCountMap(rows: { postId: string; _count: { _all: number } }[]) {
  return new Map(rows.map(r => [r.postId, r._count._all]))
}

export async function reconcileCounts(): Promise<ReconcileReport> {
  return {
    creatorPosts: await reconcileCreatorPosts(),
    campaignPosts: await reconcileCampaignPosts(),
  }
}

async function reconcileCreatorPosts() {
  const posts = await prisma.creatorPost.findMany({
    select: { id: true, likesCount: true, commentsCount: true },
  })

  const [likeGroups, commentGroups] = await Promise.all([
    prisma.creatorPostLike.groupBy({ by: ['postId'], _count: { _all: true } }),
    prisma.creatorPostComment.groupBy({
      by: ['postId'],
      where: { isDeleted: false },
      _count: { _all: true },
    }),
  ])
  const likes = toCountMap(likeGroups)
  const comments = toCountMap(commentGroups)

  let corrected = 0
  for (const p of posts) {
    const trueLikes = likes.get(p.id) ?? 0
    const trueComments = comments.get(p.id) ?? 0
    if (trueLikes === p.likesCount && trueComments === p.commentsCount) continue
    await prisma.creatorPost.update({
      where: { id: p.id },
      data: { likesCount: trueLikes, commentsCount: trueComments },
    })
    corrected++
  }
  return { checked: posts.length, corrected }
}

async function reconcileCampaignPosts() {
  const posts = await prisma.post.findMany({
    select: { id: true, likesCount: true, commentsCount: true },
  })

  const [likeGroups, commentGroups] = await Promise.all([
    prisma.like.groupBy({ by: ['postId'], _count: { _all: true } }),
    prisma.comment.groupBy({
      by: ['postId'],
      where: { isDeleted: false },
      _count: { _all: true },
    }),
  ])
  const likes = toCountMap(likeGroups)
  const comments = toCountMap(commentGroups)

  let corrected = 0
  for (const p of posts) {
    const trueLikes = likes.get(p.id) ?? 0
    const trueComments = comments.get(p.id) ?? 0
    if (trueLikes === p.likesCount && trueComments === p.commentsCount) continue
    await prisma.post.update({
      where: { id: p.id },
      data: { likesCount: trueLikes, commentsCount: trueComments },
    })
    corrected++
  }
  return { checked: posts.length, corrected }
}
