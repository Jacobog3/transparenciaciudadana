export const revalidate = 3600;

export async function GET() {
  const line = process.env.ADS_TXT_LINE?.trim();
  const body = line && line.length > 0
    ? `${line}\n`
    : "# Configure ADS_TXT_LINE in environment variables\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
