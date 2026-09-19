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

// @route   POST /api/issues/check-duplicate
// @desc    Check if a similar issue exists within geographic radius
router.post('/check-duplicate', async (req, res) => {
  const { category, coordX, coordY, title } = req.body;
  
  try {
    const targetX = parseFloat(coordX);
    const targetY = parseFloat(coordY);

    if (isNaN(targetX) || isNaN(targetY) || !category) {
      return res.json({ isDuplicate: false, existingIssue: null });
    }

    // Find active non-closed issues matching same category
    const activeIssues = await Issue.find({
      category,
      status: { $nin: ['closed'] }
    });

    let duplicateMatch = null;
    let minDistance = Infinity;

    for (const issue of activeIssues) {
      const dist = Math.sqrt(Math.pow(issue.coordX - targetX, 2) + Math.pow(issue.coordY - targetY, 2));
      // Radius threshold: <= 50 coordinate units
      if (dist <= 50 && dist < minDistance) {
        minDistance = dist;
        duplicateMatch = issue;
      }
    }

    if (duplicateMatch) {
      return res.json({
        isDuplicate: true,
        distance: Math.round(minDistance),
        existingIssue: duplicateMatch
      });
    }

    res.json({ isDuplicate: false, existingIssue: null });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error checking duplicates');
  }
});

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

// @route   POST /api/issues/:id/support
// @desc    Support/Confirm an existing issue instead of creating duplicate
router.post('/:id/support', auth, async (req, res) => {
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
    if (issue.upvotedUsers.includes(email)) {
      return res.status(400).json({ msg: 'You have already reported/supported this existing issue.' });
    }

    issue.upvotedUsers.push(email);
    issue.upvotes += 1;
    issue.priorityScore = Math.min(100, issue.priorityScore + 5);

    user.karma += 10;
    if (!user.badges.includes('civic-supporter')) {
      user.badges.push('civic-supporter');
    }

    await issue.save();
    await user.save();

    res.json({ msg: 'Supported existing issue successfully!', issue });
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
  const { status, assignee, resolvedPhoto, resolutionNote } = req.body;

  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ msg: 'Issue not found' });
    }

    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ msg: 'Authorization denied: Admin role required' });
    }

    // MANDATORY VALIDATION: Admin CANNOT directly close an issue!
    if (status === 'closed') {
      return res.status(400).json({
        msg: 'Admin cannot directly close an issue. Citizen verification is required before closing.'
      });
    }

    // MANDATORY VALIDATION: Resolution photo required for marking as resolved/awaiting verification
    if (status === 'resolved' || status === 'awaiting_verification') {
      const finalResolvedPhoto = resolvedPhoto || issue.resolvedPhoto;
      if (!finalResolvedPhoto || finalResolvedPhoto.trim() === '') {
        return res.status(400).json({
          msg: 'Resolution proof photo is required to mark an issue as resolved.'
        });
      }

      issue.status = 'awaiting_verification'; // Status becomes RESOLVED_AWAITING_VERIFICATION
      issue.resolvedPhoto = finalResolvedPhoto;
      if (resolutionNote !== undefined) issue.resolutionNote = resolutionNote;
      issue.resolvedAt = new Date();

      issue.timeline.push({
        status: 'awaiting_verification',
        title: 'Resolution Submitted (Awaiting Citizen Verification)',
        note: resolutionNote ? `Admin Note: ${resolutionNote}` : 'Proof photo uploaded by municipal operator. Awaiting citizen verification.',
        date: getFormattedDate()
      });
    } else if (status !== undefined) {
      const oldStatus = issue.status;
      issue.status = status;
      if (status !== oldStatus) {
        let title = 'Status Updated';
        let note = `Ticket marked as ${status.toUpperCase()}`;
        if (status === 'progress') {
          title = 'Investigation Dispatched';
          note = 'Municipal inspection team dispatched to coordinates.';
        }
        issue.timeline.push({
          status,
          title,
          note,
          date: getFormattedDate()
        });
      }
    }

    if (assignee !== undefined) {
      const oldAssignee = issue.assignee;
      issue.assignee = assignee;
      if (assignee !== oldAssignee) {
        issue.timeline.push({
          status: issue.status,
          title: 'Assigned Operations',
          note: `Department assignee updated to ${assignee.toUpperCase()}`,
          date: getFormattedDate()
        });
      }
    }

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/issues/:id/verify
// @desc    Citizen verification of admin resolution (Verify -> CLOSED, Reject -> IN_PROGRESS)
router.post('/:id/verify', auth, async (req, res) => {
  const { action, feedbackNote } = req.body;

  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ msg: 'Issue not found' });
    }

    if (issue.status !== 'awaiting_verification' && issue.status !== 'resolved') {
      return res.status(400).json({ msg: 'This issue is not currently awaiting verification.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (action === 'verify') {
      issue.status = 'closed';
      issue.verificationDetails = {
        verifiedBy: user.email,
        verifiedAt: new Date(),
        status: 'verified',
        feedbackNote: feedbackNote || 'Resolution verified by citizen'
      };

      issue.timeline.push({
        status: 'closed',
        title: 'Citizen Verified & Closed',
        note: `Citizen confirmed issue resolution. ${feedbackNote ? 'Feedback: ' + feedbackNote : 'Ticket officially closed.'}`,
        date: getFormattedDate()
      });

      // Award Karma to citizen for verifying (+25)
      user.karma += 25;
      await user.save();
    } else if (action === 'reject') {
      issue.status = 'progress';
      issue.verificationDetails = {
        verifiedBy: user.email,
        verifiedAt: new Date(),
        status: 'rejected',
        feedbackNote: feedbackNote || 'Issue not properly resolved'
      };

      issue.timeline.push({
        status: 'progress',
        title: 'Resolution Rejected by Citizen',
        note: `Verification failed. Returned to In Progress. ${feedbackNote ? 'Reason: ' + feedbackNote : ''}`,
        date: getFormattedDate()
      });

      // Add rejection comment
      issue.comments.push({
        author: `${user.name} (Citizen Verification)`,
        role: 'citizen',
        text: `❌ Resolution Rejected: ${feedbackNote || 'Issue is not adequately resolved. Please reinvestigate.'}`,
        date: getFormattedTime()
      });
    } else {
      return res.status(400).json({ msg: 'Invalid verification action. Must be "verify" or "reject".' });
    }

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/issues/:id
// @desc    Delete issue (Strictly restricted to Admin role - Citizens forbidden)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access Denied: Citizens are not permitted to delete reported civic issues.' });
    }

    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) {
      return res.status(404).json({ msg: 'Issue not found' });
    }

    res.json({ msg: 'Issue deleted by administrator', id: req.params.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
