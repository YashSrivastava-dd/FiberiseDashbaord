import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFcmToken extends Document {
  token: string;
  createdAt: Date;
}

const FcmTokenSchema: Schema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We're using createdAt manually
  }
);

// Ensure unique index on token
FcmTokenSchema.index({ token: 1 }, { unique: true });

const FcmToken: Model<IFcmToken> =
  mongoose.models.FcmToken || mongoose.model<IFcmToken>('FcmToken', FcmTokenSchema);

export default FcmToken;
