import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Meeting } from '../models/Meeting.js';
import { processTranscript } from '../services/ai.service.js';
import { AuthContext, requireAdmin } from '../middleware/auth.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMeeting(doc: InstanceType<typeof Meeting> & { _id: mongoose.Types.ObjectId }) {
  return {
    id:           doc._id.toString(),
    title:        doc.title,
    date:         doc.date.toISOString(),
    duration:     doc.duration,
    participants: doc.participants,
    transcript:   doc.transcript,
    summary:      doc.summary,
    mom:          doc.mom,
    actionItems:  doc.actionItems.map(a => ({
      id:          (a._id as mongoose.Types.ObjectId).toString(),
      description: a.description,
      assignee:    a.assignee,
      dueDate:     a.dueDate,
      status:      a.status,
    })),
    createdBy:    doc.createdBy,
    createdAt:    (doc as any).createdAt.toISOString(),
    updatedAt:    (doc as any).updatedAt.toISOString(),
  };
}

function formatUser(doc: InstanceType<typeof User> & { _id: mongoose.Types.ObjectId }) {
  return {
    id:          doc._id.toString(),
    firebaseUid: doc.firebaseUid,
    email:       doc.email,
    displayName: doc.displayName,
    photoURL:    doc.photoURL ?? '',
    role:        doc.role,
    isActive:    doc.isActive,
    lastLogin:   doc.lastLogin.toISOString(),
    createdAt:   (doc as any).createdAt.toISOString(),
  };
}

// ─── Resolvers ───────────────────────────────────────────────────────────────

export const resolvers = {

  // ── Field Resolvers ────────────────────────────────────────────────────────
  Meeting: {
    createdBy: async (parent: { createdBy: mongoose.Types.ObjectId }) => {
      if (!parent.createdBy) return null;
      const user = await User.findById(parent.createdBy);
      return user ? formatUser(user as any) : null;
    },
  },

  // ── Queries ────────────────────────────────────────────────────────────────
  Query: {

    // Returns the currently authenticated user
    me: async (_: unknown, __: unknown, { user }: AuthContext) => {
      return formatUser(user as any);
    },

    // Single meeting — users can only view their own; admins can view any
    meeting: async (_: unknown, { id }: { id: string }, { user }: AuthContext) => {
      const query: Record<string, unknown> = { _id: id };
      if (user.role !== 'admin') query.createdBy = user._id;
      const doc = await Meeting.findOne(query);
      return doc ? formatMeeting(doc as any) : null;
    },

    // Paginated meetings for the current user
    myMeetings: async (
      _: unknown,
      { page = 1, limit = 10, search }: { page?: number; limit?: number; search?: string },
      { user }: AuthContext
    ) => {
      const filter: Record<string, unknown> = { createdBy: user._id };
      if (search) filter.title = { $regex: search, $options: 'i' };

      const skip  = (page - 1) * limit;
      const total = await Meeting.countDocuments(filter);
      const docs  = await Meeting.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

      return {
        meetings: docs.map(d => formatMeeting(d as any)),
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    },

    // Action items assigned to the current user (by name match, across ALL meetings)
    myActionItems: async (
      _: unknown,
      { status }: { status?: string },
      { user }: AuthContext
    ) => {
      // No createdBy filter — items assigned to this user may be in meetings
      // created by other team members (e.g. admin-created org meetings).
      const filter: Record<string, unknown> = {
        'actionItems.assignee': { $regex: user.displayName, $options: 'i' },
      };

      const docs = await Meeting.find(filter);
      const items: unknown[] = [];
      docs.forEach(doc => {
        doc.actionItems.forEach(a => {
          if (!status || a.status === status) {
            if (a.assignee.toLowerCase().includes(user.displayName.toLowerCase())) {
              items.push({
                id:          (a._id as mongoose.Types.ObjectId).toString(),
                description: a.description,
                assignee:    a.assignee,
                dueDate:     a.dueDate,
                status:      a.status,
              });
            }
          }
        });
      });
      return items;
    },

    // ── Admin queries ──────────────────────────────────────────────────────
    allMeetings: async (
      _: unknown,
      { page = 1, limit = 20, search }: { page?: number; limit?: number; search?: string },
      { user }: AuthContext
    ) => {
      requireAdmin(user);
      const filter: Record<string, unknown> = {};
      if (search) filter.title = { $regex: search, $options: 'i' };

      const skip  = (page - 1) * limit;
      const total = await Meeting.countDocuments(filter);
      const docs  = await Meeting.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

      return {
        meetings: docs.map(d => formatMeeting(d as any)),
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    },

    allUsers: async (
      _: unknown,
      { page = 1, limit = 50 }: { page?: number; limit?: number },
      { user }: AuthContext
    ) => {
      requireAdmin(user);
      const skip  = (page - 1) * limit;
      const total = await User.countDocuments();
      const docs  = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
      return { users: docs.map(d => formatUser(d as any)), total };
    },

    dashboardStats: async (_: unknown, __: unknown, { user }: AuthContext) => {
      requireAdmin(user);
      const [totalMeetings, totalUsers, actionItemsData] = await Promise.all([
        Meeting.countDocuments(),
        User.countDocuments(),
        Meeting.aggregate([
          { $unwind: '$actionItems' },
          { $group: { _id: '$actionItems.status', count: { $sum: 1 } } },
        ]),
      ]);

      const open      = actionItemsData.find(d => d._id === 'pending')?.count ?? 0;
      const inProg    = actionItemsData.find(d => d._id === 'in_progress')?.count ?? 0;
      const completed = actionItemsData.find(d => d._id === 'completed')?.count ?? 0;

      return {
        totalMeetings,
        totalUsers,
        openActionItems:      open + inProg,
        completedActionItems: completed,
      };
    },
  },

  // ── Mutations ──────────────────────────────────────────────────────────────
  Mutation: {

    // Create a meeting from transcript (sent by Chrome extension)
    createMeeting: async (
      _: unknown,
      { input }: { input: { transcript: string; title?: string; participants?: string[]; duration?: number } },
      { user }: AuthContext
    ) => {
      const { transcript, title, participants = [], duration = 0 } = input;

      if (!transcript?.trim()) {
        throw new GraphQLError('transcript is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Call OpenAI to generate summary, MOM, action items
      const processed = await processTranscript(transcript);

      const meeting = await Meeting.create({
        title:       title?.trim() || `Meeting — ${new Date().toLocaleDateString()}`,
        createdBy:   user._id,
        date:        new Date(),
        duration,
        participants,
        transcript,
        summary:     processed.summary,
        mom:         processed.mom,
        actionItems: processed.actionItems.map(item => ({
          description: item.description,
          assignee:    item.assignee,
          dueDate:     item.dueDate,
          status:      'pending',
        })),
      });

      return formatMeeting(meeting as any);
    },

    // Update a single action item status
    updateActionItem: async (
      _: unknown,
      { meetingId, actionId, status }: { meetingId: string; actionId: string; status: string },
      { user }: AuthContext
    ) => {
      // Users can only update their own meetings; admins can update any
      const filter: Record<string, unknown> = { _id: meetingId, 'actionItems._id': actionId };
      if (user.role !== 'admin') filter.createdBy = user._id;

      const doc = await Meeting.findOneAndUpdate(
        filter,
        { $set: { 'actionItems.$.status': status } },
        { new: true }
      );

      if (!doc) {
        throw new GraphQLError('Meeting or action item not found.', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return formatMeeting(doc as any);
    },

    // Update current user's profile
    updateProfile: async (
      _: unknown,
      { input }: { input: { displayName?: string; photoURL?: string } },
      { user }: AuthContext
    ) => {
      const updated = await User.findByIdAndUpdate(
        user._id,
        { $set: { ...input } },
        { new: true }
      );
      if (!updated) throw new GraphQLError('User not found.', { extensions: { code: 'NOT_FOUND' } });
      return formatUser(updated as any);
    },

    // ── Admin mutations ────────────────────────────────────────────────────
    updateUserRole: async (
      _: unknown,
      { userId, role }: { userId: string; role: 'admin' | 'user' },
      { user }: AuthContext
    ) => {
      requireAdmin(user);
      const updated = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true });
      if (!updated) throw new GraphQLError('User not found.', { extensions: { code: 'NOT_FOUND' } });
      return formatUser(updated as any);
    },

    deactivateUser: async (
      _: unknown,
      { userId }: { userId: string },
      { user }: AuthContext
    ) => {
      requireAdmin(user);
      if (userId === user._id.toString()) {
        throw new GraphQLError('Cannot deactivate your own account.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const updated = await User.findByIdAndUpdate(userId, { $set: { isActive: false } }, { new: true });
      if (!updated) throw new GraphQLError('User not found.', { extensions: { code: 'NOT_FOUND' } });
      return formatUser(updated as any);
    },

    deleteMeeting: async (
      _: unknown,
      { meetingId }: { meetingId: string },
      { user }: AuthContext
    ) => {
      requireAdmin(user);
      const result = await Meeting.findByIdAndDelete(meetingId);
      return !!result;
    },
  },
};
