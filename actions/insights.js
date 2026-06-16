"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkUser } from "@/lib/checkUser";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateAIInsights({ industry, skills, experience }) {
  const skillsList = Array.isArray(skills) ? skills.join(", ") : skills || "None";

  const prompt = `
You are an expert career market analyst with deep knowledge of the global and Indian job market in 2024.

Analyze the following professional profile and generate accurate, data-driven career insights:

Profile:
- Industry: ${industry}
- Years of Experience: ${experience}
- Current Skills: ${skillsList}

Your task:
1. Deeply analyze each skill mentioned: ${skillsList}
2. Research the current market demand, salary trends, and growth potential for these specific skills
3. Generate personalized insights based on this exact skill combination

Return ONLY a valid JSON object. No markdown, no explanation, just JSON:
{
  "growthRate": <number>,
  "demandLevel": "<string>",
  "marketOutlook": "<string>",
  "salaryRanges": [
    {
      "role": "<string>",
      "min": <number>,
      "max": <number>,
      "median": <number>,
      "location": "India"
    }
  ],
  "topSkills": [<string>],
  "keyTrends": [<string>],
  "recommendedSkills": [<string>]
}

Field instructions:

growthRate:
- Analyze the actual market demand and growth trajectory of these specific skills: ${skillsList}
- Consider how much companies are hiring for these skills right now
- Consider future demand in next 2-3 years
- Return a realistic percentage between 2.0 and 30.0
- Examples for reference (DO NOT blindly copy, analyze the actual skills given):
  * Only basic skills like HTML/CSS with no JS → around 2-5
  * Basic JS, jQuery, Bootstrap only → around 4-7
  * Modern frontend like React/Vue/Angular → around 8-13
  * Full stack with Node.js/Python backend → around 12-16
  * Data Science with Python, Pandas, ML → around 15-20
  * DevOps with Docker, Kubernetes, CI/CD → around 16-21
  * Cloud with AWS/Azure/GCP certifications → around 15-20
  * AI/ML with deep learning, LLMs → around 20-26
  * Combination of Full Stack + AI + Cloud + DevOps → around 23-28
- If skills are completely unknown or niche, analyze their actual market presence

demandLevel:
- Based on your analysis of ${skillsList} in current job market
- Must be exactly one of: "Very High", "High", "Medium", "Low"
- Derive from growthRate:
  * growthRate >= 20 → "Very High"
  * growthRate >= 13 → "High"  
  * growthRate >= 7 → "Medium"
  * growthRate < 7 → "Low"

marketOutlook:
- Based on future demand for ${skillsList}
- Must be exactly one of: "Positive", "Neutral", "Negative"

salaryRanges:
- 5 realistic job roles that match someone with ${experience} years experience and skills: ${skillsList}
- Salary in INR per year (realistic Indian market 2024)
- ${experience <= 1 ? "Fresher/Junior roles only" : experience <= 3 ? "Junior to Mid-level roles" : experience <= 6 ? "Mid to Senior level roles" : "Senior, Lead, Architect level roles"}

topSkills:
- 5 most in-demand skills RIGHT NOW for someone in ${industry} with ${experience} years experience
- Skills that companies are actively hiring for

keyTrends:
- 5 current market trends directly relevant to someone with skills: ${skillsList}
- Trends that will impact their career in next 1-2 years

recommendedSkills:
- 10 skills this person should learn NEXT to increase their market value
- MUST NOT include any skill already in: ${skillsList}
- Should complement and build upon their existing skills
- Ranked by market demand and career impact
`;

  const result = await model.generateContent(prompt);
  const text = result.response
    .text()
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(text);
}

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser();
  if (!user) throw new Error("Unauthorized");

  const cacheKey = `${user.clerkUserId}-${user.industry}`;

  const existingInsight = await prisma.userInsight.findUnique({
    where: { cacheKey },
  });

  // Cache valid hai — return karo (7 din tak same data)
  if (existingInsight && new Date() < new Date(existingInsight.nextUpdate)) {
    return {
      salaryRanges: existingInsight.salaryRanges,
      growthRate: existingInsight.growthRate,
      demandLevel: existingInsight.demandLevel,
      topSkills: existingInsight.topSkills,
      marketOutlook: existingInsight.marketOutlook,
      keyTrends: existingInsight.keyTrends,
      recommendedSkills: existingInsight.recommendedSkills,
      lastUpdated: existingInsight.lastUpdated,
      nextUpdate: existingInsight.nextUpdate,
    };
  }

  // Fresh data Gemini se lo
  const insights = await generateAIInsights({
    industry: user.industry,
    skills: user.skills,
    experience: user.experience,
  });

  // DB mein save karo
  const updated = await prisma.userInsight.upsert({
    where: { cacheKey },
    update: {
      ...insights,
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      cacheKey,
      userId: user.id,
      industry: user.industry,
      ...insights,
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    salaryRanges: updated.salaryRanges,
    growthRate: updated.growthRate,
    demandLevel: updated.demandLevel,
    topSkills: updated.topSkills,
    marketOutlook: updated.marketOutlook,
    keyTrends: updated.keyTrends,
    recommendedSkills: updated.recommendedSkills,
    lastUpdated: updated.lastUpdated,
    nextUpdate: updated.nextUpdate,
  };
}