export const typeDefs = `#graphql

  # ─── Enums ───────────────────────────────────────────────────────────────
  enum ActionStatus {
    pending
    in_progress
    completed
  }

  enum Role {
    admin
    user
  }

  # ─── Types ───────────────────────────────────────────────────────────────
  type ActionItem {
    id: ID!
    description: String!
    assignee: String!
    dueDate: String!
    status: ActionStatus!
  }

  type Meeting {
    id: ID!
    title: String!
    date: String!
    duration: Int!
    participants: [String!]!
    transcript: String!
    summary: String!
    mom: String!
    actionItems: [ActionItem!]!
    createdBy: User
    createdAt: String!
    updatedAt: String!
  }

  type User {
    id: ID!
    firebaseUid: String!
    email: String!
    displayName: String!
    photoURL: String
    role: Role!
    isActive: Boolean!
    lastLogin: String!
    createdAt: String!
  }

  type MeetingPage {
    meetings: [Meeting!]!
    total: Int!
    page: Int!
    pages: Int!
  }

  type UserPage {
    users: [User!]!
    total: Int!
  }

  type DashboardStats {
    totalMeetings: Int!
    totalUsers: Int!
    openActionItems: Int!
    completedActionItems: Int!
  }

  # ─── Inputs ──────────────────────────────────────────────────────────────
  input CreateMeetingInput {
    transcript: String!
    title: String
    participants: [String!]
    duration: Int
  }

  input UpdateProfileInput {
    displayName: String
    photoURL: String
  }

  # ─── Queries ─────────────────────────────────────────────────────────────
  type Query {
    # Any authenticated user
    me: User!
    meeting(id: ID!): Meeting
    myMeetings(page: Int, limit: Int, search: String): MeetingPage!
    myActionItems(status: ActionStatus): [ActionItem!]!

    # Admin only
    allMeetings(page: Int, limit: Int, search: String): MeetingPage!
    allUsers(page: Int, limit: Int): UserPage!
    dashboardStats: DashboardStats!
  }

  # ─── Mutations ───────────────────────────────────────────────────────────
  type Mutation {
    # Any authenticated user
    createMeeting(input: CreateMeetingInput!): Meeting!
    updateActionItem(meetingId: ID!, actionId: ID!, status: ActionStatus!): Meeting!
    updateProfile(input: UpdateProfileInput!): User!

    # Admin only
    updateUserRole(userId: ID!, role: Role!): User!
    deactivateUser(userId: ID!): User!
    deleteMeeting(meetingId: ID!): Boolean!
  }
`;
