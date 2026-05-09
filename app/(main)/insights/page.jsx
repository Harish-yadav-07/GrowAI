import { getIndustryInsights } from "@/actions/insights";
import { getUserOnboardingStatus } from "@/actions/user";
import { redirect } from "next/navigation";
import InsightsView from "./_components/insights-view";

export default async function DashboardPage() {
  const { isOnboarded } = await getUserOnboardingStatus();

  // If not onboarded, redirect to onboarding page
  // Skip this check if already on the onboarding page
  if (!isOnboarded) {
    redirect("/onboarding");
  }

  const insights = await getIndustryInsights();

  return (
    <div className="container mx-auto">
      <InsightsView insights={insights} />
    </div>
  );
}