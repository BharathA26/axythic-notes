import mongoose, { Document, Schema } from 'mongoose';

export type ActionStatus = 'pending' | 'in_progress' | 'completed';

export interface IActionItem {
  _id?: mongoose.Types.ObjectId;
  description: string;
  assignee: string;
  dueDate: string;
  status: ActionStatus;
}

export interface IMeeting extends Document {
  title: string;
  createdBy: mongoose.Types.ObjectId;
  date: Date;
  duration: number;
  participants: string[];
  transcript: string;
  summary: string;
  mom: string;
  actionItems: IActionItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ActionItemSchema = new Schema<IActionItem>({
  description: { type: String, required: true },
  assignee:    { type: String, required: true },
  dueDate:     { type: String, default: 'TBD' },
  status:      { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
});

const MeetingSchema = new Schema<IMeeting>(
  {
    title:       { type: String, required: true },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:        { type: Date, default: Date.now },
    duration:    { type: Number, default: 0 },
    participants:{ type: [String], default: [] },
    transcript:  { type: String, required: true },
    summary:     { type: String, default: '' },
    mom:         { type: String, default: '' },
    actionItems: { type: [ActionItemSchema], default: [] },
  },
  { timestamps: true }
);

// Index to efficiently fetch meetings by user
MeetingSchema.index({ createdBy: 1, createdAt: -1 });

export const Meeting = mongoose.model<IMeeting>('Meeting', MeetingSchema);
