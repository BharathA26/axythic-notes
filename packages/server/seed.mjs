/**
 * Seed script — inserts a test meeting into MongoDB for UI testing.
 * Run from packages/server: node seed.mjs
 * Requires MongoDB to be running and MONGODB_URI set in .env
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(fileURLToPath(import.meta.url), '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/axythic';

// ── Schemas (inline for portability) ──────────────────────────────────────────
const ActionItemSchema = new mongoose.Schema({
  description: String, assignee: String,
  dueDate: String, status: { type: String, default: 'pending' }
});

const MeetingSchema = new mongoose.Schema(
  { title: String, createdBy: mongoose.Schema.Types.ObjectId, date: Date,
    duration: Number, participants: [String], transcript: String,
    summary: String, mom: String, actionItems: [ActionItemSchema] },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  { firebaseUid: String, email: String, displayName: String,
    photoURL: String, role: String, isActive: Boolean, lastLogin: Date },
  { timestamps: true }
);

const User    = mongoose.model('User', UserSchema);
const Meeting = mongoose.model('Meeting', MeetingSchema);

// ── Connect & Seed ─────────────────────────────────────────────────────────────
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB:', MONGODB_URI);

// Find the existing user (Bharat)
const user = await User.findOne({ email: 'bharat@pheonixsolutions.com' });
if (!user) {
  console.error('❌ User bharat@pheonixsolutions.com not found. Make sure you have signed in to the app at least once.');
  process.exit(1);
}
console.log('👤 Found user:', user.displayName, '(', user.role, ')');

// Check if test meetings already exist
const existingCount = await Meeting.countDocuments({ createdBy: user._id });
if (existingCount > 0) {
  console.log(`ℹ️  User already has ${existingCount} meeting(s). Skipping duplicate seed.`);
  console.log('   Delete them from the app or MongoDB if you want a fresh seed.');
  process.exit(0);
}

const meetings = [
  {
    title: 'Sprint Planning — Axythic Notes Q1',
    createdBy: user._id,
    date: new Date(),
    duration: 18,
    participants: ['Bharat', 'Priya', 'Rahul'],
    transcript: `Bharat [09:00]: Good morning everyone. Let's get started with our sprint planning.
Priya [09:01]: Morning! I've prepared the backlog items.
Rahul [09:01]: Hi all. Ready to go.
Bharat [09:02]: First item — the user authentication module. Status?
Priya [09:03]: Firebase JWT is working end to end. We still need to add the password reset flow.
Rahul [09:04]: I can take that task. Estimate 3 story points.
Bharat [09:05]: Perfect. Target end of this week, Rahul.
Priya [09:06]: I'll review his PR by Friday.
Bharat [09:07]: Next — MongoDB migration. Rahul?
Rahul [09:08]: User and Meeting models are done. The meeting detail endpoint works.
Bharat [09:09]: Any blockers?
Rahul [09:10]: The OpenAI key needs rotating — hitting rate limits.
Bharat [09:11]: I'll rotate it today and send the new key to Priya by 2 PM.
Priya [09:12]: Got it. I'll update the server .env after.
Bharat [09:13]: Last item — dashboard UI. Dark theme looks great but mobile view needs work.
Priya [09:14]: I'll fix responsiveness before the client demo next Tuesday.
Rahul [09:15]: I can help with CSS if needed.
Bharat [09:16]: Great. Summary: Rahul owns password reset by Friday, I'm rotating the key today, Priya handles mobile fixes before Tuesday's demo.
Priya [09:17]: All clear.
Rahul [09:17]: Sounds good.
Bharat [09:18]: Meeting adjourned!`,
    summary: `The team held a sprint planning session to align on priorities for the upcoming sprint. Three key areas were discussed: authentication, database migration, and dashboard UI improvements.\n\nPriya confirmed that Firebase JWT authentication is fully working end-to-end. The remaining work is the password reset flow, which Rahul volunteered to implement by end of week, with Priya reviewing his PR by Friday.\n\nRahul reported that the MongoDB Mongoose models for User and Meeting are complete and tested locally. A minor blocker was identified — the OpenAI API key needs rotation due to rate limiting. Bharat committed to handling this today and sharing the new key with Priya by 2 PM.\n\nFinally, the dashboard UI was discussed. The dark theme is complete, but mobile responsiveness needs improvement before the client demo next Tuesday. Priya will lead this fix with support from Rahul on CSS.`,
    mom: `## Minutes of Meeting\n\n**Date:** ${new Date().toLocaleDateString()}\n**Duration:** 18 minutes\n\n### Attendees\n- Bharat (Meeting Lead)\n- Priya (Frontend/Auth)\n- Rahul (Backend/DB)\n\n### Agenda\n1. Authentication module status\n2. MongoDB migration progress\n3. Dashboard UI polish\n\n### Discussion Points\n- Firebase JWT auth is complete; password reset remains\n- Mongoose schemas for User & Meeting are done\n- OpenAI API key needs rotation (rate limit issue)\n- Mobile responsive design needed before client demo\n\n### Decisions\n- Rahul to implement password reset by Friday\n- Bharat to rotate OpenAI key today, share with Priya by 2 PM\n- Priya to complete mobile responsive fixes before Tuesday demo\n- Rahul available to assist with CSS if needed`,
    actionItems: [
      { description: 'Implement password reset flow', assignee: 'Rahul', dueDate: '2026-03-28', status: 'pending' },
      { description: 'Review password reset PR', assignee: 'Priya', dueDate: '2026-03-28', status: 'pending' },
      { description: 'Rotate OpenAI API key and update .env', assignee: 'Bharat', dueDate: '2026-03-22', status: 'pending' },
      { description: 'Fix mobile responsive layout before client demo', assignee: 'Priya', dueDate: '2026-03-25', status: 'in_progress' },
    ],
  },
  {
    title: 'Product Roadmap Review — Q2 Planning',
    createdBy: user._id,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    duration: 35,
    participants: ['Bharat', 'Priya', 'Rahul', 'Anita'],
    transcript: `Bharat [14:00]: Let's start the Q2 roadmap review. Anita, do you want to kick off with the business goals?
Anita [14:01]: Sure. Our primary goal for Q2 is to onboard 50 enterprise customers and reduce churn to under 5%.
Priya [14:02]: For the product side, we're planning to add team workspaces and shared meeting history.
Rahul [14:03]: On the infrastructure side, I want to propose moving to a microservices architecture by Q2 end.
Bharat [14:04]: That's ambitious. What's the timeline?
Rahul [14:05]: If we start in April, we can have the auth and meeting services split out by June.
Anita [14:06]: Enterprise customers are also asking for SSO support — SAML and OKTA specifically.
Priya [14:07]: I can design the SSO integration. Rough estimate is 4 weeks.
Bharat [14:08]: Let's prioritise SSO then team workspaces. Rahul's microservices can be a background track.
Rahul [14:09]: Agreed. I'll start the architecture docs this week.
Anita [14:10]: Also, we need a proper onboarding flow. New users are dropping off during setup.
Priya [14:11]: I'll add that to the design backlog. We should do some user research first.
Bharat [14:12]: Good point. Anita, can you get 5 customer interviews scheduled for next week?
Anita [14:13]: Yes, I'll reach out today.
Bharat [14:14]: Perfect. Let's regroup next Friday to review the Q2 spec doc.`,
    summary: `The team reviewed Q2 product and business objectives. The primary business goal is onboarding 50 enterprise customers while keeping churn below 5%.\n\nThree major product initiatives were identified for Q2: SSO integration (SAML/OKTA) for enterprise customers — estimated at 4 weeks and prioritised first; team workspaces with shared meeting history as the second priority; and a background track for microservices architecture separation.\n\nA user onboarding problem was identified — new users drop off during setup. The decision was made to conduct user research (5 customer interviews) before designing the onboarding flow. Anita will schedule these interviews immediately. A Q2 spec document will be reviewed the following Friday.`,
    mom: `## Minutes of Meeting\n\n**Date:** ${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n**Duration:** 35 minutes\n\n### Attendees\n- Bharat (Product Lead)\n- Priya (Frontend/Design)\n- Rahul (Engineering)\n- Anita (Business/Customer Success)\n\n### Q2 Business Goals\n- Onboard 50 enterprise customers\n- Reduce churn to under 5%\n\n### Prioritised Initiatives\n1. **SSO Integration** (SAML/OKTA) — 4 weeks, Priya leads\n2. **Team Workspaces** — shared meeting history\n3. **Microservices Architecture** — background track, Rahul leads\n\n### Key Decisions\n- SSO takes priority over team workspaces\n- User research needed before redesigning onboarding\n- Q2 spec doc review scheduled for next Friday`,
    actionItems: [
      { description: 'Schedule 5 customer interviews for user research', assignee: 'Anita', dueDate: '2026-03-24', status: 'completed' },
      { description: 'Write microservices architecture design doc', assignee: 'Rahul', dueDate: '2026-03-29', status: 'pending' },
      { description: 'Design SSO integration (SAML/OKTA) flow', assignee: 'Priya', dueDate: '2026-04-05', status: 'pending' },
      { description: 'Prepare Q2 spec document for review', assignee: 'Bharat', dueDate: '2026-03-28', status: 'in_progress' },
    ],
  },
];

for (const m of meetings) {
  const doc = await Meeting.create(m);
  console.log(`✅ Created: "${doc.title}" (${doc.actionItems.length} action items)`);
}

console.log('\n🎉 Seed complete! Refresh http://localhost:3000 to see the meetings.');
await mongoose.disconnect();
