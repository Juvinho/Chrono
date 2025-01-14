import { pool } from '../db/connection.js';

export class PollService {
  async vote(postId: string, userId: string, optionIndex: number): Promise<void> {
    // Check if user already voted
    const existing = await pool.query(
      'SELECT 1 FROM poll_votes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existing.rows.length > 0) {
      throw new Error('User already voted on this poll');
    }

    // Add vote
    await pool.query(
      'INSERT INTO poll_votes (post_id, user_id, option_index) VALUES ($1, $2, $3)',
      [postId, userId, optionIndex]
    );

    // Update poll options counts in post
    const post = await pool.query('SELECT poll_options FROM posts WHERE id = $1', [postId]);
    if (post.rows[0]?.poll_options) {
      const options = post.rows[0].poll_options;
      if (options[optionIndex]) {
        options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
        await pool.query('UPDATE posts SET poll_options = $1::jsonb WHERE id = $2', [
          JSON.stringify(options),
          postId,
        ]);
      }
    }
  }

  async getVotesForPost(postId: string): Promise<{ [username: string]: number }> {
    const result = await pool.query(
      `SELECT u.username, pv.option_index
       FROM poll_votes pv
       JOIN users u ON pv.user_id = u.id
       WHERE pv.post_id = $1`,
      [postId]
    );

    const votes: { [username: string]: number } = {};
    result.rows.forEach((row) => {
      votes[row.username] = row.option_index;
    });

    return votes;
  }

  async getVotesForPosts(postIds: string[]): Promise<{ [postId: string]: { [username: string]: number } }> {
    if (postIds.length === 0) return {};

    const result = await pool.query(
      `SELECT pv.post_id, u.username, pv.option_index
       FROM poll_votes pv
       JOIN users u ON pv.user_id = u.id
       WHERE pv.post_id = ANY($1)`,
      [postIds]
    );

    const postVotes: { [postId: string]: { [username: string]: number } } = {};
    result.rows.forEach((row) => {
      const postId = row.post_id;
      if (!postVotes[postId]) {
        postVotes[postId] = {};
      }
      postVotes[postId][row.username] = row.option_index;
    });

    return postVotes;
  }
}

