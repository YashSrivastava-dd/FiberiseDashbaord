import FcmToken, { IFcmToken } from '../models/FcmToken';

export class TokenService {
  /**
   * Save or update an FCM token
   * Returns success even if token already exists (handles duplicates gracefully)
   */
  async saveToken(token: string): Promise<{ success: boolean }> {
    try {
      await FcmToken.findOneAndUpdate(
        { token },
        { token, createdAt: new Date() },
        { upsert: true, new: true }
      );
      return { success: true };
    } catch (error: any) {
      // If it's a duplicate key error, still return success
      if (error.code === 11000 || error.code === 11001) {
        return { success: true };
      }
      throw error;
    }
  }

  /**
   * Get all registered FCM tokens
   */
  async getAllTokens(): Promise<string[]> {
    const tokens = await FcmToken.find({}).select('token -_id').lean();
    return tokens.map((t) => t.token);
  }

  /**
   * Get total count of registered tokens
   */
  async getTokenCount(): Promise<number> {
    return await FcmToken.countDocuments();
  }

  /**
   * Delete a token
   */
  async deleteToken(token: string): Promise<{ success: boolean }> {
    const result = await FcmToken.deleteOne({ token });
    return { success: result.deletedCount > 0 };
  }
}

export const tokenService = new TokenService();
