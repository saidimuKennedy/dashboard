import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env" });

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  const passwordHash = await hashPassword("founder123");

  const founder = await prisma.user.upsert({
    where: { email: "founder@jiaminie.tech" },
    update: {},
    create: {
      email: "founder@jiaminie.tech",
      passwordHash,
      firstName: "Founder",
      lastName: "Jiaminie",
      role: UserRole.FOUNDER,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@jiaminie.tech" },
    update: {},
    create: {
      email: "admin@jiaminie.tech",
      passwordHash: await hashPassword("admin123"),
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMINISTRATOR,
    },
  });

  const products = await Promise.all(
    ["JChats", "CRM", "POS", "Socials", "WhatsApp Commerce", "Web Development", "Support & Maintenance"].map(
      (name) =>
        prisma.product.upsert({
          where: { slug: name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "") },
          update: {},
          create: {
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, ""),
            description: `${name} product by Jiaminie Tech`,
          },
        })
    )
  );

  const categories = await Promise.all(
    ["Compliance", "Engineering", "Finance", "Research", "Products"].map((name) =>
      prisma.knowledgeCategory.upsert({
        where: { slug: name.toLowerCase() },
        update: {},
        create: { name, slug: name.toLowerCase(), createdBy: founder.id },
      })
    )
  );

  await prisma.knowledgeArticle.upsert({
    where: { slug: "welcome-to-jip" },
    update: {},
    create: {
      title: "Welcome to JIP",
      slug: "welcome-to-jip",
      summary: "Getting started with the Jiaminie Intelligence Platform",
      content:
        "# Welcome to JIP\n\nJIP is the institutional memory and intelligence layer for Jiaminie Tech.\n\n## Core Modules\n\n- Executive Dashboard\n- Knowledge Base\n- Founder Journal\n- Meeting Intelligence\n- Decision Log\n- Research Pipeline\n- Customer & Revenue Intelligence\n- Compliance Center\n- AI Assistant",
      authorId: founder.id,
      categoryId: categories[0].id,
      status: "PUBLISHED",
      createdBy: founder.id,
    },
  });

  await prisma.customer.createMany({
    skipDuplicates: true,
    data: [
      { name: "Acme Corp", company: "Acme Corp", email: "contact@acme.co.ke", industry: "Retail", createdBy: founder.id },
      { name: "Safari Logistics", company: "Safari Logistics", email: "ops@safari.co.ke", industry: "Logistics", createdBy: founder.id },
    ],
  });

  await prisma.complianceItem.createMany({
    data: [
      {
        title: "KRA Tax Filing — Q1",
        category: "KRA",
        status: "PENDING_REVIEW",
        riskRating: "MEDIUM",
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: founder.id,
      },
      {
        title: "Kenya Data Protection Act Review",
        category: "Data Protection",
        status: "COMPLIANT",
        riskRating: "LOW",
        createdBy: founder.id,
      },
    ],
  });

  await prisma.risk.createMany({
    data: [
      {
        title: "API vendor dependency",
        description: "Reliance on third-party messaging APIs",
        category: "OPERATIONAL",
        level: "MEDIUM",
        mitigation: "Maintain fallback providers",
        createdBy: founder.id,
      },
      {
        title: "Unpatched dependencies",
        category: "SECURITY",
        level: "HIGH",
        mitigation: "Weekly dependency scans",
        createdBy: founder.id,
      },
    ],
  });

  await prisma.revenueEntry.createMany({
    data: products.slice(0, 2).map((p, i) => ({
      amount: 50000 + i * 25000,
      type: "subscription",
      description: `${p.name} monthly subscription`,
      productId: p.id,
      createdBy: founder.id,
    })),
  });

  await prisma.aiPrompt.createMany({
    skipDuplicates: true,
    data: [
      {
        slug: "founder_brief",
        name: "Founder Daily Brief",
        purpose: "Morning executive summary",
        template: "Summarize yesterday's activity, priorities, and risks for the founder.",
        approved: true,
      },
      {
        slug: "business_advisor",
        name: "Business Advisor",
        purpose: "Strategic business guidance",
        template: "Provide evidence-based business recommendations for Jiaminie Tech.",
        approved: true,
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Login: founder@jiaminie.tech / founder123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
