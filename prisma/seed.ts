import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const sections = [
    { name: "PR / Gifted Campaigns", slug: "pr-gifted-campaigns", group: "OPPORTUNITIES", iconEmoji: "🤝", sortOrder: 1, sectionType: "post_feed" },
    { name: "Paid Collaborations", slug: "paid-collaborations", group: "OPPORTUNITIES", iconEmoji: "💰", sortOrder: 2, sectionType: "post_feed" },
    { name: "TikTok Commission Campaigns", slug: "tiktok-commission", group: "OPPORTUNITIES", iconEmoji: "🎵", sortOrder: 3, sectionType: "post_feed" },
    { name: "App Partners", slug: "app-partners", group: "OPPORTUNITIES", iconEmoji: "📱", sortOrder: 4, sectionType: "post_feed" },
    { name: "Events", slug: "events", group: "OPPORTUNITIES", iconEmoji: "🎪", sortOrder: 5, sectionType: "post_feed" },
    { name: "News & Updates", slug: "news-updates", group: "WELCOME", iconEmoji: "📢", sortOrder: 1, sectionType: "post_feed" },
    { name: "Video Library", slug: "video-library", group: "LEARNING", iconEmoji: "🎬", sortOrder: 1, sectionType: "post_feed" },
    { name: "Social Tips", slug: "social-tips", group: "LEARNING", iconEmoji: "💡", sortOrder: 2, sectionType: "post_feed" },
    { name: "Industry News", slug: "industry-news", group: "LEARNING", iconEmoji: "📰", sortOrder: 3, sectionType: "post_feed" },
    { name: "Creator Workbooks", slug: "creator-workbooks", group: "LEARNING", iconEmoji: "📚", sortOrder: 4, sectionType: "post_feed" },
    { name: "Group Chat", slug: "group-chat", group: "COMMUNITY", iconEmoji: "💬", sortOrder: 1, sectionType: "chat_channel" },
  ]

  for (const section of sections) {
    await prisma.section.upsert({
      where: { slug: section.slug },
      update: {},
      create: section,
    })
  }
  console.log("✓ Sections seeded")

  await prisma.creator.upsert({
    where: { email: "admin@wegotyouagency.com" },
    update: {},
    create: {
      email: "admin@wegotyouagency.com",
      passwordHash: bcrypt.hashSync("WGY2024Admin!", 10),
      firstName: "WGY",
      lastName: "LTD",
      isAdmin: true,
      membershipStatus: "active",
      membershipType: "free",
    }
  })
  console.log("✓ Admin account seeded")

  const templates = [
    { sequenceName: "Onboarding", dayOffset: 0, subject: "Welcome Message", isActive: true, sortOrder: 1, body: "Hey {firstName}! 👋 Welcome to WGY! We are so excited to have you here. Head to the Opportunities section to see what brand campaigns are live right now. Any questions just reply to this message!" },
    { sequenceName: "Onboarding", dayOffset: 2, subject: "First Opportunities", isActive: true, sortOrder: 2, body: "Hey {firstName}! Just checking in — have you had a chance to browse the Opportunities section yet? There are some great campaigns live right now that we think would be perfect for you!" },
    { sequenceName: "Onboarding", dayOffset: 5, subject: "Community Introduction", isActive: true, sortOrder: 3, body: "Hi {firstName}! Have you joined the community chat yet? Head to the Community tab and introduce yourself in Group Chat. Our creators love connecting with each other!" },
    { sequenceName: "Onboarding", dayOffset: 10, subject: "Campaign Tips", isActive: true, sortOrder: 4, body: "Hey {firstName}! Here are our top tips for getting selected for campaigns: Complete your profile fully, engage with posts by liking and commenting, and apply to everything relevant to your niche!" },
    { sequenceName: "Onboarding", dayOffset: 30, subject: "One Month Check-in", isActive: false, sortOrder: 5, body: "Hi {firstName}! You have been part of WGY for a whole month! We would love to hear how you are finding it. Any feedback or questions just reply to this message!" },
  ]

  for (const template of templates) {
    const existing = await prisma.messageTemplate.findFirst({
      where: { sequenceName: template.sequenceName, dayOffset: template.dayOffset },
    })
    if (!existing) {
      await prisma.messageTemplate.create({ data: template })
    }
  }
  console.log("✓ Message templates seeded")

  const chatRooms = [
    { slug: 'group-chat',      name: 'Group Chat',                  emoji: '💬', description: 'General chat for all WGY creators',             sortOrder: 1 },
    { slug: 'social-links',    name: 'Share Your Social Links',     emoji: '🔗', description: 'Drop your Instagram, TikTok and YouTube links', sortOrder: 2 },
    { slug: 'affiliate-links', name: 'Affiliate Links',             emoji: '💰', description: 'Share your affiliate codes and links',           sortOrder: 3 },
    { slug: 'creator-collabs', name: 'Looking for Creator Collabs', emoji: '👀', description: 'Find other creators to collaborate with',        sortOrder: 4 },
    { slug: 'events-chat',     name: 'Events Chat',                 emoji: '🎪', description: 'Upcoming WGY events and meetups',               sortOrder: 5 },
    { slug: 'creator-corner',  name: 'The Creator Corner',          emoji: '⭐', description: 'Posts and updates from the community',          sortOrder: 6 },
  ]
  for (const room of chatRooms) {
    await prisma.chatRoom.upsert({
      where: { slug: room.slug },
      update: {},
      create: room,
    })
  }
  console.log("✓ Chat rooms seeded")

  console.log("✅ Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
