import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/staff-session";

export default async function Home() {
  redirect((await currentStaff()) ? "/staff/lists" : "/staff/sign-in");
}
