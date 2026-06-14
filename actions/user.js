"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./insights";
import { prisma } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser(); // ✅ findUnique → checkUser
  if (!user) throw new Error("Unauthorized");

  try {
    let industryInsight = await prisma.industryInsight.findUnique({
      where: { industry: data.industry },
    });

    let insights = null;
    if (!industryInsight) {
      insights = await generateAIInsights({
        industry: data.industry,
        skills: data.skills,
        experience: data.experience,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (!industryInsight) {
        industryInsight = await tx.industryInsight.create({
          data: {
            industry: data.industry,
            ...insights,
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          industry: data.industry,
          experience: data.experience,
          bio: data.bio,
          skills: data.skills,
        },
      });

      return { updatedUser, industryInsight };
    });

    revalidatePath("/");
    return result.updatedUser;
  } catch (error) {
    console.error("Error updating user and industry:", error);
    throw new Error(`Failed to update profile: ${error.message || "Unknown error"}`);
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