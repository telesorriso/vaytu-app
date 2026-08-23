import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/dal';
import { getBusinessDetail } from '@/lib/admin/data';
import { DecisionPanel } from './decision-panel';

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const detail = await getBusinessDetail(id);
  if (!detail) notFound();

  const { profile, businessProfile, verifications } = detail;
  const latestVerification = verifications[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/admin/business" className="text-sm text-zinc-500 hover:underline">
        ← Business in attesa
      </Link>

      <div className="mt-2 mb-6 flex items-center gap-4">
        {businessProfile.logo_url && (
          <Image
            src={businessProfile.logo_url}
            alt={businessProfile.company_name}
            width={56}
            height={56}
            className="h-14 w-14 rounded-md object-cover"
            unoptimized
          />
        )}
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            {businessProfile.company_name}
          </h1>
          <p className="text-sm text-zinc-500">
            {businessProfile.industry} · {businessProfile.city}
          </p>
        </div>
      </div>

      {businessProfile.cover_image_url && (
        <Image
          src={businessProfile.cover_image_url}
          alt="Cover"
          width={640}
          height={200}
          className="mb-6 h-32 w-full rounded-md object-cover"
          unoptimized
        />
      )}

      <dl className="mb-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-500">Indirizzo</dt>
        <dd>{businessProfile.address ?? '—'}</dd>
        <dt className="text-zinc-500">Referente</dt>
        <dd>{profile.full_name}</dd>
        <dt className="text-zinc-500">Email</dt>
        <dd className="truncate">{profile.email}</dd>
        <dt className="text-zinc-500">Telefono</dt>
        <dd>{profile.phone ?? '—'}</dd>
        <dt className="text-zinc-500">Sito</dt>
        <dd className="truncate">{businessProfile.website_url ?? '—'}</dd>
        <dt className="text-zinc-500">Instagram</dt>
        <dd>{businessProfile.instagram_handle ? `@${businessProfile.instagram_handle}` : '—'}</dd>
        <dt className="col-span-2 text-zinc-500">Descrizione</dt>
        <dd className="col-span-2">{businessProfile.description ?? '—'}</dd>
        <dt className="text-zinc-500">Account attivo</dt>
        <dd>{profile.is_active ? 'Sì' : 'No — sospeso'}</dd>
      </dl>

      <DecisionPanel
        businessId={id}
        verificationId={latestVerification?.id ?? null}
        verificationStatus={latestVerification?.status ?? null}
        isActive={profile.is_active}
      />
    </div>
  );
}
