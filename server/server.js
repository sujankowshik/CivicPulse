import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import User from './models/User.js';
import Issue from './models/Issue.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - Body:`, JSON.stringify(req.body));
  
  const oldJson = res.json;
  res.json = function(data) {
    console.log(`[RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    return oldJson.apply(res, arguments);
  };
  
  const oldSend = res.send;
  res.send = function(data) {
    console.log(`[RESPONSE] ${req.method} ${req.url} - Status: ${res.statusCode} - Text:`, data);
    return oldSend.apply(res, arguments);
  };
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse';

// Seed Database helper
async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding initial default users...');
      
      const admin = new User({
        name: 'Chief Operator (Operations)',
        email: 'admin@civicpulse.gov',
        password: 'admin123',
        role: 'admin',
        avatar: getMockAvatarSVG('Jack'),
        karma: 350,
        badges: ['eagle-eye', 'civic-leader']
      });

      const citizen = new User({
        name: 'Alex Mercer',
        email: 'citizen@civicpulse.org',
        password: 'citizen123',
        role: 'citizen',
        avatar: getMockAvatarSVG('Felix'),
        karma: 120,
        badges: ['pothole-patrol']
      });

      await admin.save();
      await citizen.save();
      console.log('Default users seeded successfully.');
    }

    const issueCount = await Issue.countDocuments();
    if (issueCount === 0) {
      console.log('Seeding initial default issues...');

      const issues = [
        {
          title: 'Deep pothole creating hazard on Broadway Ave',
          description: 'A massive pothole has opened up near the main intersection of Broadway and 4th. Several cars have suffered tyre damage already. Needs urgent filling.',
          category: 'roads',
          status: 'progress',
          photo: getMockImageSVG('roads', false),
          resolvedPhoto: getMockImageSVG('roads', true),
          coordX: 180,
          coordY: 90,
          locationText: 'Broadway Ave near 4th Crossing',
          upvotes: 24,
          upvotedUsers: [],
          authorName: 'Alex Mercer',
          authorEmail: 'citizen@civicpulse.org',
          priorityScore: 78,
          prioritySeverity: 'high',
          assignee: 'roads',
          comments: [
            {
              author: 'John Doe (Citizen)',
              role: 'citizen',
              text: 'Almost hit this last night. Very dangerous since it fills with rain water and looks like a shallow puddle.',
              date: '2026-06-12 18:24'
            },
            {
              author: 'Chief Operator (Staff)',
              role: 'admin',
              text: 'Assigned inspection team. Pothole will be patched on Thursday night under temporary road maintenance contract.',
              date: '2026-06-14 09:12'
            }
          ],
          timeline: [
            {
              status: 'pending',
              title: 'Reported',
              note: 'Issue submitted by verified citizen.',
              date: 'June 12, 2026'
            },
            {
              status: 'progress',
              title: 'Assigned Operations',
              note: 'Ticket approved. Assigned to Roads & Transport Department.',
              date: 'June 14, 2026'
            }
          ]
        },
        {
          title: 'Illegal industrial waste dumping behind City Green Park',
          description: 'Discovered several barrels of suspicious chemical paint residue and bags of construction debris dumped behind the park walking trail.',
          category: 'waste',
          status: 'pending',
          photo: getMockImageSVG('waste', false),
          coordX: 290,
          coordY: 70,
          locationText: 'City Green Park trail behind sports shed',
          upvotes: 12,
          upvotedUsers: [],
          authorName: 'Verified Citizen',
          authorEmail: 'guest@civicpulse.org',
          priorityScore: 65,
          prioritySeverity: 'medium',
          assignee: 'unassigned',
          comments: [
            {
              author: 'Clara Miller (Citizen)',
              role: 'citizen',
              text: 'This is awful! Children play near here. The municipal body needs to install CCTV near the entrance.',
              date: '2026-06-15 14:10'
            }
          ],
          timeline: [
            {
              status: 'pending',
              title: 'Reported',
              note: 'Awaiting inspector dispatch.',
              date: 'June 15, 2026'
            }
          ]
        },
        {
          title: 'Water main pipeline bursting on South Marina Road',
          description: 'A fresh water pipe is broken and leaking clean water all over the road. The water flow is heavy and causing flooding near building basements.',
          category: 'water',
          status: 'progress',
          photo: getMockImageSVG('water', false),
          coordX: 310,
          coordY: 170,
          locationText: 'South Marina Road in front of Plaza Apts',
          upvotes: 18,
          upvotedUsers: [],
          authorName: 'Alex Mercer',
          authorEmail: 'citizen@civicpulse.org',
          priorityScore: 84,
          prioritySeverity: 'high',
          assignee: 'water',
          comments: [
            {
              author: 'David Vance (Citizen)',
              role: 'citizen',
              text: 'Our building has lost water pressure completely. Please fix this soon!',
              date: '2026-06-13 11:42'
            },
            {
              author: 'Chief Operator (Staff)',
              role: 'admin',
              text: 'Emergency shut-off valve activated. Repair crew is on-site fabricating a bypass pipe section.',
              date: '2026-06-13 15:30'
            }
          ],
          timeline: [
            {
              status: 'pending',
              title: 'Reported',
              note: 'High pressure leak flagged by residents.',
              date: 'June 13, 2026'
            },
            {
              status: 'progress',
              title: 'Dispatched & Assigned',
              note: 'Water Board crew active. Valving shutoff complete.',
              date: 'June 13, 2026'
            }
          ]
        },
        {
          title: 'Main streetlight burnt out in Westside Suburbs Lane 5',
          description: 'The streetlight at the bend in Lane 5 has been completely dark for over a week, making walking home at night feel unsafe.',
          category: 'lighting',
          status: 'resolved',
          photo: getMockImageSVG('lighting', false),
          resolvedPhoto: getMockImageSVG('lighting', true),
          coordX: 60,
          coordY: 130,
          locationText: 'Westside Suburbs Lane 5 near block C bend',
          upvotes: 4,
          upvotedUsers: [],
          authorName: 'Clara Miller',
          authorEmail: 'clara@civicpulse.org',
          priorityScore: 32,
          prioritySeverity: 'low',
          assignee: 'lighting',
          comments: [],
          timeline: [
            {
              status: 'pending',
              title: 'Reported',
              note: 'Issue submitted by citizen.',
              date: 'June 10, 2026'
            },
            {
              status: 'progress',
              title: 'Assigned Operations',
              note: 'Bulb scheduled for swap.',
              date: 'June 11, 2026'
            },
            {
              status: 'resolved',
              title: 'Bulb Swapped',
              note: 'Switched to energy efficient LED bulb. Ticket resolved.',
              date: 'June 12, 2026'
            }
          ]
        },
        {
          title: 'Broken swing set chains in City Green Park',
          description: 'The swing set chains have rusted and snapped on two of the main kids swings in the central park. Danger of injury if children attempt to climb it.',
          category: 'parks',
          status: 'resolved',
          photo: getMockImageSVG('parks', false),
          resolvedPhoto: getMockImageSVG('parks', true),
          coordX: 270,
          coordY: 85,
          locationText: 'City Green Park playground area',
          upvotes: 9,
          upvotedUsers: [],
          authorName: 'Alex Mercer',
          authorEmail: 'citizen@civicpulse.org',
          priorityScore: 48,
          prioritySeverity: 'medium',
          assignee: 'parks',
          comments: [],
          timeline: [
            {
              status: 'pending',
              title: 'Reported',
              note: 'Damaged play equipment flagged.',
              date: 'June 08, 2026'
            },
            {
              status: 'progress',
              title: 'Scheduled Repair',
              note: 'Assigned to Parks Board crew.',
              date: 'June 09, 2026'
            },
            {
              status: 'resolved',
              title: 'Play equipment replaced',
              note: 'Installed new heavy-duty chains on swings.',
              date: 'June 11, 2026'
            }
          ]
        }
      ];

      await Issue.insertMany(issues);
      console.log('Default issues seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

// Mock image SVGs inline generators
function getMockImageSVG(category, isResolved) {
  let innerSVG = '';
  const resolvedColor = '#10b981';
  const issueColor = '#ef4444';
  const color = isResolved ? resolvedColor : issueColor;
  const text = isResolved ? 'RESOLVED' : 'ACTIVE ISSUE';
  
  if (category === 'roads') {
    innerSVG = `<rect width="400" height="250" fill="#334155"/>
      <line x1="0" y1="125" x2="400" y2="125" stroke="#fef08a" stroke-dasharray="20,15" stroke-width="8"/>
      <circle cx="200" cy="125" r="45" fill="${color}" opacity="0.3"/>
      <circle cx="200" cy="125" r="10" fill="${color}"/>
      <text x="200" y="210" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="18" text-anchor="middle">${text}: Pothole</text>`;
  } else if (category === 'waste') {
    innerSVG = `<rect width="400" height="250" fill="#0f172a"/>
      <path d="M120 200 L280 200 L260 90 L140 90 Z" fill="#475569" stroke="#64748b" stroke-width="6"/>
      <rect x="130" y="70" width="140" height="20" rx="4" fill="#334155"/>
      <circle cx="200" cy="140" r="35" fill="${color}" opacity="0.35"/>
      <text x="200" y="220" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="18" text-anchor="middle">${text}: Waste pile</text>`;
  } else if (category === 'water') {
    innerSVG = `<rect width="400" height="250" fill="#0c4a6e"/>
      <path d="M50 125 Q 125 75, 200 125 T 350 125" fill="none" stroke="#38bdf8" stroke-width="12" stroke-linecap="round"/>
      <path d="M200 125 L200 220" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="10,10"/>
      <circle cx="200" cy="220" r="8" fill="${color}"/>
      <text x="200" y="40" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="18" text-anchor="middle">${text}: Pipeline leak</text>`;
  } else if (category === 'lighting') {
    innerSVG = `<rect width="400" height="250" fill="#020617"/>
      <circle cx="200" cy="80" r="45" fill="${isResolved ? '#fef08a' : '#1e293b'}" opacity="${isResolved ? '0.7' : '1'}"/>
      <line x1="200" y1="0" x2="200" y2="80" stroke="#475569" stroke-width="4"/>
      <text x="200" y="210" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="18" text-anchor="middle">${text}: Streetlight</text>`;
  } else {
    innerSVG = `<rect width="400" height="250" fill="#064e3b"/>
      <circle cx="120" cy="180" r="60" fill="#15803d"/>
      <circle cx="280" cy="180" r="50" fill="#15803d"/>
      <line x1="160" y1="80" x2="160" y2="160" stroke="${color}" stroke-width="6"/>
      <line x1="240" y1="80" x2="240" y2="160" stroke="${color}" stroke-width="6"/>
      <text x="200" y="220" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="18" text-anchor="middle">${text}: Park equipment</text>`;
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">${innerSVG}</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function getMockAvatarSVG(seed) {
  const hash = seed.split('').reduce((acc, char) => char.charCodeAt(0) + (acc << 5) - acc, 0);
  const color = `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#334155" stroke-width="3"/>
    <circle cx="50" cy="50" r="30" fill="${color}"/>
    <circle cx="40" cy="45" r="4" fill="#0f172a"/>
    <circle cx="60" cy="45" r="4" fill="#0f172a"/>
    <path d="M 35 60 Q 50 75, 65 60" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB database connected successfully.');
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`Express server is running on port ${PORT}.`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });
