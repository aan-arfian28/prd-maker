import { NextRequest, NextResponse } from "next/server";
import { resolveProviderType, resolveApiKey, getProvider } from "@/lib/providers/registry";
import type { ProviderType } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { apiKey: userApiKey, provider: userProvider } = await request.json();

    const providerType: ProviderType = resolveProviderType(userProvider);
    const apiKey = resolveApiKey(providerType, userApiKey);

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: `API Key untuk ${providerType} belum dikonfigurasi.` },
        { status: 400 }
      );
    }

    const provider = getProvider(providerType);

    // fetchModels makes an authenticated request to the provider's API.
    // If it succeeds, the API key is valid and the network is reachable.
    const models = await provider.fetchModels(apiKey);

    return NextResponse.json({
      ok: true,
      modelCount: models.length,
      provider: provider.name,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menguji koneksi";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
