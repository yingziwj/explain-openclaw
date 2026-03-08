export async function GET() {
  return new Response("# Add your Google AdSense publisher line here when approved.\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
