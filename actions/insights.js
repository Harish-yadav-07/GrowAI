"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export async function generateAIInsights({
  industry,
  skills,
  experience,
}) {
  const skillsList = Array.isArray(skills)
    ? skills.join(", ")
    : skills || "None";

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

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      industry: true,
      skills: true,
      experience: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Generate fresh personalized insights
  const insights = await generateAIInsights({
    industry: user.industry,
    skills: user.skills,
    experience: user.experience,
  });

  return {
  ...insights,
  lastUpdated: new Date(),
  nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
};
}