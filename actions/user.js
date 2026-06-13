"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./insights";
import { prisma } from "@/lib/prisma";

export async function updateUser(data) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  try {
    // Check if industry insight already exists
    let industryInsight = await prisma.industryInsight.findUnique({
      where: {
        industry: data.industry,
      },
    });

    // Generate AI insights OUTSIDE the transaction
    let insights = null;

    if (!industryInsight) {
      insights = await generateAIInsights(data.industry);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create industry insight only if it doesn't exist
      if (!industryInsight) {
        industryInsight = await tx.industryInsight.create({
          data: {
            industry: data.industry,
            ...insights,
            nextUpdate: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
            ),
          },
        });
      }

      // Update user
      const updatedUser = await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          industry: data.industry,
          experience: data.experience,
          bio: data.bio,
          skills: data.skills,
        },
      });

      return {
        updatedUser,
        industryInsight,
      };
    });

    revalidatePath("/");

    return result.updatedUser;
  } catch (error) {
    console.error("Error updating user and industry:", error);
    throw new Error(
      `Failed to update profile: ${error.message || "Unknown error"}`
    );
  }
}

export async function getUserOnboardingStatus() {
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
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    isOnboarded: !!user.industry,
  };
}