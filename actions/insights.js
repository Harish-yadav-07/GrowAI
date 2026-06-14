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
You are an expert career advisor.

Generate personalized career insights for:

Industry: ${industry}
Experience: ${experience} years
Current Skills: ${skillsList}

Return ONLY valid JSON in this format:

{
  "salaryRanges": [
    {
      "role": "string",
      "min": 0,
      "max": 0,
      "median": 0,
      "location": "India"
    }
  ],
  "growthRate": 0,
  "demandLevel": "High",
  "topSkills": [],
  "marketOutlook": "Positive",
  "keyTrends": [],
  "recommendedSkills": []
}

Rules:
- Return ONLY JSON.
- Include at least 5 salary roles.
- Include at least 5 topSkills.
- Include at least 5 keyTrends.
- Include at least 5 recommendedSkills.
- recommendedSkills MUST depend on the user's current skills.
- Do NOT recommend skills the user already has.
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

  const user = await checkUser(); // ✅
  if (!user) throw new Error("Unauthorized");

  // ✅ Bug Fix: Pehle DB mein check karo — 7 din purana nahi hai toh wahi return karo
  // Isse Gemini API baar baar call nahi hoga aur quota save rahega
  const existingInsight = await prisma.industryInsight.findUnique({
    where: { industry: user.industry },
  });

  if (existingInsight && new Date() < new Date(existingInsight.nextUpdate)) {
    // Cache valid hai — DB se serve karo, Gemini call mat karo
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

  // Cache expired ya nahi hai — Gemini se fresh data lo
  const insights = await generateAIInsights({
    industry: user.industry,
    skills: user.skills,
    experience: user.experience,
  });

  // DB mein save/update karo
  const updated = await prisma.industryInsight.upsert({
    where: { industry: user.industry },
    update: {
      ...insights,
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
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