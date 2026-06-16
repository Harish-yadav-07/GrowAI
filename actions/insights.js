"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkUser } from "@/lib/checkUser";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateAIInsights({ industry, skills, experience }) {
  const skillsList = Array.isArray(skills) ? skills.join(", ") : skills || "None";

  // ✅ Fix 1: Dynamic year
  const currentYear = new Date().getFullYear();

  const prompt = `
You are an expert career market analyst with deep knowledge of the global and Indian job market in ${currentYear}.

Analyze the following professional profile and generate accurate, data-driven career insights:

Profile:
- Industry: ${industry}
- Years of Experience: ${experience}
- Current Skills: ${skillsList}

Your task:
1. Deeply analyze each skill mentioned: ${skillsList}
2. Research the current market demand, salary trends, and growth potential for these specific skills in ${currentYear}
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
- Consider how much companies are hiring for these skills right now in ${currentYear}
- Consider future demand in next 2-3 years
- ✅ Fix 2: Return a realistic percentage strictly between 5.0 and 100.0
- Examples for reference (DO NOT blindly copy, analyze the actual skills given):
  * Only basic skills like HTML/CSS with no JS → around 5-15
  * Basic JS, jQuery, Bootstrap only → around 10-20
  * Modern frontend like React/Vue/Angular → around 20-35
  * Full stack with Node.js/Python backend → around 30-50
  * Data Science with Python, Pandas, ML → around 40-60
  * DevOps with Docker, Kubernetes, CI/CD → around 45-65
  * Cloud with AWS/Azure/GCP certifications → around 40-60
  * AI/ML with deep learning, LLMs → around 60-80
  * Combination of Full Stack + AI + Cloud + DevOps → around 70-90
  * Cutting edge: AI + Robotics + Quantum + Blockchain → around 85-100
- If skills are completely unknown or niche, analyze their actual market presence
- MUST be between 5.0 and 100.0 — never below 5, never above 100

demandLevel:
- Based on your analysis of ${skillsList} in ${currentYear} job market
- Must be exactly one of: "Very High", "High", "Medium", "Low"
- Derive from growthRate:
  * growthRate >= 70 → "Very High"
  * growthRate >= 40 → "High"
  * growthRate >= 20 → "Medium"
  * growthRate < 20 → "Low"

marketOutlook:
- Based on future demand for ${skillsList} beyond ${currentYear}
- Must be exactly one of: "Positive", "Neutral", "Negative"

salaryRanges:
- 10 realistic job roles for someone with ${experience} years experience and skills: ${skillsList}
- Salary in INR per year (realistic Indian market ${currentYear})
- ${experience <= 1 ? "Fresher/Junior roles only" : experience <= 3 ? "Junior to Mid-level roles" : experience <= 6 ? "Mid to Senior level roles" : "Senior, Lead, Architect level roles"}

topSkills:
- 10 most in-demand skills RIGHT NOW in ${currentYear} for someone in ${industry} with ${experience} years experience

keyTrends:
- 10 current market trends in ${currentYear} directly relevant to someone with skills: ${skillsList}
- Trends that will impact their career in next 1-2 years

recommendedSkills:
- 10 skills this person should learn NEXT to increase their market value in ${currentYear} and beyond
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

  const data = JSON.parse(text);

  // ✅ Safety check — growthRate kabhi 5 se kam ya 100 se zyada nahi hoga
  data.growthRate = Math.min(Math.max(parseFloat(data.growthRate), 5), 100);

  return data;
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
