import express from 'express';
import Issue from '../models/Issue.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Helper to format date string
const getFormattedDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getFormattedTime = () => {
  const now = new Date();
  const datePart = now.toISOString().split('T')[0];
  const timePart = now.toTimeString().split(' ')[0].substring(0, 5);
  return `${datePart} ${timePart}`;
};

// AI Triage calculation logic (Server-side)
function runAIEngineTriage(title, description, category) {
  let baseScore = 20;
  if (category === 'roads') baseScore = 40;
  if (category === 'waste') baseScore = 30;
  if (category === 'lighting') baseScore = 25;
  if (category === 'water') baseScore = 50;
  if (category === 'parks') baseScore = 20;

  const textToScan = `${title} ${description}`.toLowerCase();
  let keywordBoost = 0;

  const severeKeys = ['danger', 'hazard', 'risk', 'accident', 'harm', 'collapse', 'injury', 'toxic', 'poison'];
  severeKeys.forEach(kw => { if (textToScan.includes(kw)) keywordBoost += 10; });

  const urgentKeys = ['urgent', 'emergency', 'immediate', 'leak', 'flood', 'burst', 'electric shock', 'exposed wire'];
  urgentKeys.forEach(kw => { if (textToScan.includes(kw)) keywordBoost += 8; });

  const childrenKeys = ['child', 'kids', 'elderly', 'school', 'play', 'baby'];
  childrenKeys.forEach(kw => { if (textToScan.includes(kw)) keywordBoost += 5; });

  const finalScore = Math.min(100, baseScore + keywordBoost);
  
  let severity = 'low';
  if (finalScore >= 70) severity = 'high';
  else if (finalScore >= 40) severity = 'medium';

  return { score: finalScore, severity: severity };
}

// @route   GET /api/issues
// @desc    Get all issues
router.get('/', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/issues
// @desc    Create a new issue
router.post('/', auth, async (req, res) => {
  const { title, description, category, photo, coordX, coordY, locationText } = req.body;

  try {
    // Fetch reporting user info
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const triage = runAIEngineTriage(title, description, category);
    const dateStr = new Date().toISOString().split('T')[0];

    const newIssue = new Issue({
      title,
      description,
      category,
      photo,
      coordX: parseFloat(coordX),
      coordY: parseFloat(coordY),
      locationText: locationText || `Block ${Math.floor(parseFloat(coordX)/30) + 1}, Sector ${Math.floor(parseFloat(coordY)/20) + 1}`,
      upvotes: 1,
      upvotedUsers: [user.email],
      authorName: user.name,
      authorEmail: user.email,
      priorityScore: triage.score,
      prioritySeverity: triage.severity,
      assignee: 'unassigned',
      comments: [],
      timeline: [
        {
          status: 'pending',
          title: 'Reported',
          note: `Issue submitted. AI triage assessment complete: Severity rated as ${triage.severity.toUpperCase()} (${triage.score}/100).`,
          date: getFormattedDate()
        }
      ]
    });

    const issue = await newIssue.save();
    
    // Add First Pulse or Community Guardian badge to citizen
    const newBadges = [...user.badges];
    if (!newBadges.includes('first-pulse')) {
      newBadges.push('first-pulse');
    }
    
    // Count user reported issues
    const myReportsCount = await Issue.countDocuments({ authorEmail: user.email });
    if (myReportsCount >= 3 && !newBadges.includes('community-guardian')) {
      newBadges.push('community-guardian');
    }
    
    user.badges = newBadges;
    await user.save();

    res.json(issue);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/issues/:id/upvote
// @desc    Upvote/downvote toggle on an issue
router.post('/:id/upvote', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ msg: 'Issue not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const email = user.email;
    const upvoteIndex = issue.upvotedUsers.indexOf(email);

    if (upvoteIndex !== -1) {
      // Already upvoted -> remove upvote
      issue.upvotedUsers.splice(upvoteIndex, 1);
      issue.upvotes = Math.max(0, issue.upvotes - 1);
      
      // Remove upvote points (-10 karma)
      user.karma = Math.max(0, user.karma - 10);
    } else {
      // Add upvote
      issue.upvotedUsers.push(email);
      issue.upvotes += 1;
      
      // Award upvote points (+10 karma)
      user.karma += 10;
      
      // Award badge if first time upvoting
      if (!user.badges.includes('civic-supporter')) {
        user.badges.push('civic-supporter');
      }
    }

    await issue.save();
    await user.save();

    res.json(issue);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/issues/:id/comments
// @desc    Post a comment on an issue
router.post('/:id/comments', auth, async (req, res) => {
  const { text } = req.body;

  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ msg: 'Issue not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const newComment = {
      author: `${user.name} (${user.role === 'admin' ? 'Staff' : 'Citizen'})`,
      role: user.role,
      text,
      date: getFormattedTime()
    };

    issue.comments.push(newComment);
    await issue.save();

    // Award comment points (+15 karma for citizen)
    if (user.role === 'citizen') {
      user.karma += 15;
      if (!user.badges.includes('active-voice')) {
        user.badges.push('active-voice');
      }
      await user.save();
    }

    res.json(issue);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/issues/:id/status
// @desc    Update status & assignee of an issue (Admin operations)
router.put('/:id/status', auth, async (req, res) => {
  const { status, assignee, resolvedPhoto } = req.body;

  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ msg: 'Issue not found' });
    }

    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ msg: 'Authorization denied: Admin role required' });
    }

    const oldStatus = issue.status;
    const oldAssignee = issue.assignee;

    if (status !== undefined) issue.status = status;
    if (assignee !== undefined) issue.assignee = assignee;
    if (resolvedPhoto !== undefined) issue.resolvedPhoto = resolvedPhoto;

    // Build timeline milestones dynamically
    if (assignee !== undefined && assignee !== oldAssignee) {
      issue.timeline.push({
        status: issue.status,
        title: 'Assigned Operations',
        note: `Department assignee updated to ${assignee.toUpperCase()}`,
        date: getFormattedDate()
      });
    }

    if (status !== undefined && status !== oldStatus) {
      let title = 'Status Updated';
      let note = `Ticket marked as ${status.toUpperCase()}`;

      if (status === 'progress') {
        title = 'Investigation Dispatched';
        note = 'Municipal inspection team dispatched to coordinates.';
      } else if (status === 'resolved') {
        title = 'Resolution Complete';
        note = 'Proof photo uploaded. Resolution verified.';
      }

      issue.timeline.push({
        status,
        title,
        note,
        date: getFormattedDate()
      });
    }

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
