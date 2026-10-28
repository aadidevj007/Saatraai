'use client';

/** Datasets — ingested scenes across investigations + provider availability. */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { ArrowRight, Database, Satellite } from 'lucide-react';

import { usePageTitle } from '@/components/shell/shell-context';
import { Badge, EmptyState, ErrorState, LoadingState, Panel, StatusDot } from '@/components/ui';
import { errorMessage, imageApi, providerApi } from '@/lib/api';
import type { IngestedImage } from '@/lib/api/types';
import { useInvestigations } from '@/lib/hooks/queries';
import { formatDate, shortId } from '@/lib/utils';

interface Row {
  image: IngestedImage;
  investigationId: string;
  investigationTitle: string;
}

export default function DatasetsPage() {
  const router = useRouter();
  usePageTitle('Datasets');

  const investigationsQuery = useInvestigations({ page: 1, page_size: 20 });
  const investigations = useMemo(() => investigationsQuery.data?.items ?? [], [investigationsQuery.data]);

  const statusQuery = useQueries({
    queries: [{ queryKey: ['system-status'], queryFn: () => providerApi.status(), retry: false }],
  })[0];

  const imageResults = useQueries({
    queries: investigations.map((inv) => ({
      queryKey: ['investigation', inv.id, 'images'],
      queryFn: () => imageApi.list(inv.id),
      staleTime: 30_000,
    })),
  });

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    investigations.forEach((inv, i) => {
      const result = imageResults[i] as { data: { items: IngestedImage[] } | null | undefined } | undefined;
      if (result?.data) {
        for (const image of result.data.items) {
          out.push({ image, investigationId: inv.id, investigationTitle: inv.title });
        }
      }
    });
    return out.sort((a, b) => (b.image.acquisition_at ?? '').localeCompare(a.image.acquisition_at ?? ''));
  }, [investigations, imageResults]);

  const anyUnavailable = imageResults.some((r) => r.data === null);
  const isLoading = investigationsQuery.isPending || imageResults.some((r) => r.isPending);

  const providerServices = (statusQuery.data?.services ?? []).filter((s) =>
    ['satellite_optical', 'satellite_sar', 'rainfall'].includes(s.id),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
            <Database className="h-5 w-5 text-primary" /> Datasets
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Scenes ingested into your investigations. Imagery is uploaded manually — no catalog provider is connected.
          </p>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">{rows.length} scenes</span>
      </div>

      {/* provider availability */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {providerServices.length === 0 ? (
          <div className="rounded-xl border border-line bg-card p-3.5">
            <div className="flex items-center gap-2 text-[12.5px] text-ink-dim">
              <StatusDot state="unknown" /> Provider status unavailable
            </div>
            <p className="mt-1 text-[11.5px] text-ink-faint">The /status endpoint is not reachable on this backend.</p>
          </div>
        ) : (
          providerServices.map((service) => (
            <div key={service.id} className="rounded-xl border border-line bg-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                  <Satellite className="h-3.5 w-3.5 text-primary" /> {service.label}
                </span>
                <Badge tone={service.state === 'online' ? 'success' : 'warning'}>
                  {service.state === 'online' ? 'AVAILABLE' : service.state === 'degraded' ? 'DEGRADED' : 'NOT CONFIGURED'}
                </Badge>
              </div>
              {service.detail && <p className="mt-1 font-mono text-[10.5px] leading-snug text-ink-faint">{service.detail}</p>}
            </div>
          ))
        )}
      </div>

      {/* scenes table */}
      <div className="mt-6">
        <Panel title="Ingested scenes" subtitle="Metadata read from the backend image registry" bodyClassName="p-0">
          {isLoading ? (
            <LoadingState label="Loading scenes…" rows={4} />
          ) : investigationsQuery.isError ? (
            <ErrorState error={errorMessage(investigationsQuery.error)} onRetry={() => investigationsQuery.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title={anyUnavailable ? 'Scene listing unavailable' : 'No scenes ingested yet'}
              description={
                anyUnavailable
                  ? 'This backend does not expose image listings for investigations.'
                  : 'Open an investigation and use “Attach imagery” to ingest GeoTIFF scenes (single scene or a validated pair).'
              }
              action={
                investigations.length > 0
                  ? { label: 'Open latest investigation', onClick: () => router.push(`/investigations/${investigations[0].id}`) }
                  : { label: 'New investigation', onClick: () => router.push('/investigations/new') }
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                    <th className="px-4 py-2.5">Scene</th>
                    <th className="px-4 py-2.5">Investigation</th>
                    <th className="px-4 py-2.5">Modality</th>
                    <th className="px-4 py-2.5">Acquired</th>
                    <th className="px-4 py-2.5">Resolution</th>
                    <th className="px-4 py-2.5">CRS</th>
                    <th className="px-4 py-2.5">Format</th>
                    <th className="px-4 py-2.5">Checksum</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ image, investigationId, investigationTitle }) => (
                    <tr key={image.id} className="border-b border-line/60 transition-colors hover:bg-card">
                      <td className="px-4 py-2.5">
                        <div className="max-w-56 truncate text-[12.5px] text-ink" title={image.original_filename}>
                          {image.original_filename}
                        </div>
                        <div className="font-mono text-[9.5px] text-ink-faint">{shortId(image.id)}</div>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-ink-dim">{investigationTitle}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={image.modality === 'sar' ? 'accent' : 'primary'}>{String(image.modality)}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-ink-dim">{formatDate(image.acquisition_at)}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-ink-dim">
                        {image.width ?? '?'}×{image.height ?? '?'} · {image.band_count ?? '?'} bands
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-ink-dim">{image.crs ?? 'unknown'}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-ink-dim">{image.file_format ?? image.mime_type ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-ink-faint">{image.checksum ? image.checksum.slice(0, 12) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/investigations/${investigationId}`} className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline">
                          Open <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
