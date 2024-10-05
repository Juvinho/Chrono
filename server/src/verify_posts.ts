import { PostService } from './services/postService';
import { ReactionService } from './services/reactionService';
import { PollService } from './services/pollService';
import { UserService } from './services/userService';
import { pool } from './db/connection';

// Mock services
const postService = new PostService();
const reactionService = new ReactionService();
const pollService = new PollService();
const userService = new UserService();

// Helper to enrich post with author and reactions (COPIED FROM routes/posts.ts)
async function enrichPost(post: any, depth: number = 0, maxDepth: number = 1): Promise<any> {
  const author = await userService.getUserById(post.authorId);
  // Log if author is missing
  if (!author) {
      console.warn(`WARNING: Author not found for post ${post.id} (authorId: ${post.authorId})`);
  }
  
  const reactions = await reactionService.getReactionsForPost(post.id);
  const votes = post.pollOptions ? await pollService.getVotesForPost(post.id) : {};

  let repostOf = null;
  if (post.repostOfId) {
    const repost = await postService.getPostById(post.repostOfId);
    if (repost) {
      // Don't fetch replies for the reposted content to avoid infinite loops and excessive data
      repostOf = await enrichPost(repost, maxDepth, maxDepth); 
    }
  }

  let inReplyTo = null;
  if (post.inReplyToId) {
    const parentPost = await postService.getPostById(post.inReplyToId);
    if (parentPost) {
      const parentAuthor = await userService.getUserById(parentPost.authorId);
      inReplyTo = {
        postId: parentPost.id,
        author: {
          username: parentAuthor?.username,
          avatar: parentAuthor?.avatar,
        },
        content: parentPost.content,
      };
    }
  }

  let replies: any[] = [];
  if (depth < maxDepth) {
      const rawReplies = await postService.getReplies(post.id);
      replies = await Promise.all(rawReplies.map((r) => enrichPost(r, depth + 1, maxDepth)));
  }

  return {
    ...post,
    author: author
      ? {
          username: author.username,
          avatar: author.avatar,
          bio: author.bio,
          isVerified: author.isVerified,
          verificationBadge: author.verificationBadge,
          equippedFrame: author.equippedFrame,
          equippedEffect: author.equippedEffect,
        }
      : null,
    reactions,
    repostOf,
    inReplyTo,
    replies,
    voters: votes,
  };
}

async function verify() {
  console.log('Verifying posts...');
  
  // 0. Check total posts count
  const countRes = await pool.query('SELECT COUNT(*) FROM posts');
  console.log(`Total posts in DB: ${countRes.rows[0].count}`);

  if (parseInt(countRes.rows[0].count) === 0) {
      console.log('Creating a dummy post for verification...');
      const userRes = await pool.query('SELECT id FROM users LIMIT 1');
      if (userRes.rows.length > 0) {
          const userId = userRes.rows[0].id;
          await postService.createPost(userId, 'This is a test post for verification.');
          console.log('Dummy post created.');
      } else {
          console.error('No users found, cannot create dummy post.');
          return;
      }
  }

  // 1. Fetch raw posts like the feed does
  try {
      console.log('Fetching raw posts...');
      const posts = await postService.getPosts(undefined, { limit: 5, offset: 0 }); // undefined userId to simulate public feed
      console.log(`Fetched ${posts.length} raw posts.`);
      
      if (posts.length === 0) {
          console.log('No posts found in DB. Cannot verify enrichment.');
          return;
      }

      // 2. Enrich posts
      console.log('Enriching posts...');
      const start = performance.now();
      const enrichedPosts = await Promise.all(posts.map((post) => enrichPost(post, 0, 1)));
      const end = performance.now();
      console.log(`Enrichment took ${end - start}ms`);
      
      // 3. Check results
      enrichedPosts.forEach(p => {
          console.log(`Post ${p.id}: Author=${p.author ? p.author.username : 'NULL'}, Reactions=${JSON.stringify(p.reactions)}`);
          if (!p.author) {
              console.error(`ERROR: Post ${p.id} has no author!`);
          }
      });
      
  } catch (err) {
      console.error('Error verifying posts:', err);
  }
  
  process.exit(0);
}

verify().catch(console.error);