import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  author: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'admin', 'guest'], default: 'citizen' },
  text: { type: String, required: true },
  date: { type: String, required: true }
}, { _id: false });

const MilestoneSchema = new mongoose.Schema({
  status: { type: String, required: true },
  title: { type: String, required: true },
  note: { type: String, default: '' },
  date: { type: String, required: true }
}, { _id: false });

const IssueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['roads', 'waste', 'lighting', 'water', 'parks'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'progress', 'resolved'],
    default: 'pending'
  },
  photo: {
    type: String,
    default: ''
  },
  resolvedPhoto: {
    type: String,
    default: ''
  },
  coordX: {
    type: Number,
    required: true
  },
  coordY: {
    type: Number,
    required: true
  },
  locationText: {
    type: String,
    required: true,
    trim: true
  },
  upvotes: {
    type: Number,
    default: 0
  },
  upvotedUsers: {
    type: [String],
    default: []
  },
  authorName: {
    type: String,
    default: 'Verified Citizen'
  },
  authorEmail: {
    type: String,
    required: true
  },
  priorityScore: {
    type: Number,
    default: 40
  },
  prioritySeverity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignee: {
    type: String,
    default: 'unassigned'
  },
  comments: {
    type: [CommentSchema],
    default: []
  },
  timeline: {
    type: [MilestoneSchema],
    default: []
  }
}, { timestamps: true });

const Issue = mongoose.model('Issue', IssueSchema);
export default Issue;
