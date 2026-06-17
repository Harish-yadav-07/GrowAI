"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./insights";
import { prisma } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser();
  if (!user) throw new Error("Unauthorized");

  try {
    // ✅ Pehle IndustryInsight mein entry banao — empty values ke saath
    await prisma.industryInsight.upsert({
      where: { industry: data.industry },
      update: {}, // already hai toh kuch mat karo
      create: {
        industry: data.industry,
        growthRate: 0,
        demandLevel: "Medium",
        marketOutlook: "Positive",
        topSkills: [],
        keyTrends: [],
        recommendedSkills: [],
        salaryRanges: [],
        nextUpdate: new Date(),
      },
    });

    // ✅ Ab User update karo — foreign key satisfy ho jayega
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        industry: data.industry,
        experience: data.experience,
        bio: data.bio,
        skills: data.skills,
      },
    });

    revalidatePath("/");
    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await checkUser(); // ✅ checkUser use karo — DB mein nahi hai toh create karega
    if (!user) throw new Error("Unauthorized");

    return {
      isOnboarded: !!user.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}