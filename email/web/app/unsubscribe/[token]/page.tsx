import { notFound } from "next/navigation";
import { getUnsubscribe } from "@/lib/email";
import { TopBar } from "@/components/TopBar";
import { UnsubscribeButton } from "./UnsubscribeButton";

export const metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getUnsubscribe(token);
  if (!data) notFound();

  return (
    <>
      <TopBar />
      <main id="main" className="narrow">
        <div className="card">
          <h1>Unsubscribe</h1>
          {data.alreadyUnsubscribed ? (
            <p>You're already unsubscribed. You won't receive any more mail at <strong>{data.email}</strong>.</p>
          ) : (
            <>
              <p>Stop receiving mail at <strong>{data.email}</strong>?</p>
              <div style={{ marginTop: 16 }}><UnsubscribeButton token={token} /></div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
