import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/session";

export default async function Home() {
  redirect((await currentAccount()) ? "/account" : "/sign-in");
}
