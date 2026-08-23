import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { getCreatorDetail } from '@/lib/admin/data';
import { EVIDENCE_KIND_LABELS, type EvidenceKind } from '@/lib/db/types';
import { MetricsForm } from './metrics-form';
import { LevelForm } from './level-form';
import { DecisionPanel } from './decision-panel';

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const detail = await getCreatorDetail(id);
  if (!detail) notFound();

  const { profile, creatorProfile, instagramMetric, evidence, verifications, levels } = detail;
  const latestVerification = verifications[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/admin/creators" className="text-sm text-zinc-500 hover:underline">
        ← Creator in attesa
      </Link>

      <div className="mt-2 mb-6 flex items-center gap-4">
        {profile.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
            unoptimized
          />
        )}
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            {profile.full_name}
          </h1>
          <p className="text-sm text-zinc-500">
            @{creatorProfile.username} · {creatorProfile.city}
          </p>
        </div>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-500">Categorie</dt>
        <dd>{creatorProfile.niches.join(', ') || '—'}</dd>
        <dt className="text-zinc-500">Instagram</dt>
        <dd>@{creatorProfile.instagram_handle ?? '—'}</dd>
        <dt className="text-zinc-500">TikTok</dt>
        <dd>{creatorProfile.tiktok_handle ? `@${creatorProfile.tiktok_handle}` : '—'}</dd>
        <dt className="text-zinc-500">Portfolio</dt>
        <dd className="truncate">{creatorProfile.website_url ?? '—'}</dd>
        <dt className="text-zinc-500">Email</dt>
        <dd className="truncate">{profile.email}</dd>
        <dt className="text-zinc-500">Account attivo</dt>
        <dd>{profile.is_active ? 'Sì' : 'No — sospeso'}</dd>
      </dl>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Screenshot caricati</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-zinc-500">Nessuno screenshot caricato.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {evidence.map((e) => (
              <div key={e.id} className="space-y-1">
                <p className="text-xs font-medium text-zinc-500">
                  {e.kind ? EVIDENCE_KIND_LABELS[e.kind as EvidenceKind] ?? e.kind : 'Screenshot'}
                </p>
                {e.signedUrl ? (
                  <Image
                    src={e.signedUrl}
                    alt={e.kind ?? 'evidence'}
                    width={300}
                    height={200}
                    className="w-full rounded-md border border-zinc-200 object-cover dark:border-zinc-800"
                    unoptimized
                  />
                ) : (
                  <p className="text-xs text-red-600">Impossibile generare l&apos;anteprima.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-4">
        {instagramMetric && <MetricsForm creatorId={id} metric={instagramMetric} />}
        <LevelForm creatorId={id} currentLevelId={creatorProfile.current_level_id} levels={levels} />
        <DecisionPanel
          creatorId={id}
          verificationId={latestVerification?.id ?? null}
          verificationStatus={latestVerification?.status ?? null}
          isActive={profile.is_active}
        />
      </div>
    </div>
  );
}
