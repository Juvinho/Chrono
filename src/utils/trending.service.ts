import { Post } from '../types';

function hoursBetween(a: Date, b: Date) {
  return Math.abs((a.getTime() - b.getTime()) / 36e5);
}

function getLikes(post: Post): number {
  const reactions = post.reactions || {};
  return Object.values(reactions).reduce((sum, count) => sum + (count || 0), 0);
}

function getComments(post: Post): number {
  return (post.replies?.length || 0);
}

function getShares(post: Post, allPosts: Post[]): number {
  const id = post.id;
  // Count how many posts in the last 24h are reposts of this post
  return allPosts.filter(p => p.repostOf && p.repostOf.id === id).length;
}

export function calculateTrending(posts: Post[], now: Date = new Date()): Post[] {
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recent = posts.filter(p => {
    const ts = new Date(p.timestamp);
    return ts >= windowStart && ts <= now;
  });

  const scored = recent.map(p => {
    const likes = getLikes(p);
    const comments = getComments(p);
    const shares = getShares(p, recent);
    const ageHours = Math.max(hoursBetween(now, new Date(p.timestamp)), 0);
    const score = ((likes * 1) + (comments * 2) + (shares * 3)) / Math.pow(ageHours + 2, 1.8);
    return { post: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map(s => s.post);
}
