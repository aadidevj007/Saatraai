'use client';

/** Settings: profile, preferences, appearance, investigation defaults, security. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Database, LogOut, Radar, ShieldCheck, Trash2 } from 'lucide-react';

import { Avatar } from '@/components/auth/google-sign-in';
import { usePageTitle } from '@/components/shell/shell-context';
import { Badge, Button, Field, Input, Panel, Segmented, StatusDot } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import type { AnalysisDepth, EvidenceStrictness, InvestigationMode } from '@/lib/investigation-config';
import { BASEMAP_LIST, type BasemapId } from '@/lib/map/styles';
import { clearLocalData, readSettings, saveSettings, type AppSettings } from '@/lib/settings';
import { useToast } from '@/lib/state/toast';

export default function SettingsPage() {
  usePageTitle('Settings');
  const router = useRouter();
  const { toast } = useToast();
  const { user, google, preferences, completeProfile, signOut } = useAuth();

  const [interest, setInterest] = useState(preferences?.research_interest ?? '');
  const [organization, setOrganization] = useState(preferences?.organization ?? '');
  const [role, setRole] = useState(preferences?.role ?? '');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSettings(readSettings()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    setSettings(saveSettings(patch));
    toast({ variant: 'success', title: 'Setting saved', description: 'Stored on this device.' });
  };

  const name = google?.name ?? user?.display_name ?? user?.email ?? 'Researcher';

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-ink-dim">
          Profile comes from Google; preferences and defaults are stored on this device.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {/* profile */}
        <Panel title="Profile · Google account" subtitle="No password exists for this account">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar src={google?.picture} name={name} size={56} />
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-ink">{name}</div>
              <div className="text-[12.5px] text-ink-dim">{user?.email}</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Badge tone="primary">GOOGLE OAUTH</Badge>
                <Badge tone="neutral">user id {user?.id.slice(0, 8) ?? '—'}</Badge>
              </div>
            </div>
            <div className="ml-auto">
              <Button variant="secondary" size="sm" onClick={() => router.push('/profile')}>
                Edit research profile
              </Button>
            </div>
          </div>
        </Panel>

        {/* research preferences */}
        <Panel title="Research profile" subtitle="Used to frame investigations and shown on the dashboard">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Research interest" htmlFor="s-interest">
              <Input id="s-interest" value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="Flood dynamics" />
            </Field>
            <Field label="Organization" htmlFor="s-org">
              <Input id="s-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Institution" />
            </Field>
            <Field label="Role" htmlFor="s-role">
              <Input id="s-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Researcher" />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                completeProfile({
                  research_interest: interest.trim() || undefined,
                  organization: organization.trim() || undefined,
                  role: role.trim() || undefined,
                });
                toast({ variant: 'success', title: 'Profile saved' });
              }}
            >
              Save profile
            </Button>
          </div>
        </Panel>

        {/* appearance */}
        <Panel title="Appearance · map preferences" subtitle="Applies to the workspace map and region picker">
          {settings ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13px] text-ink">Default basemap</div>
                <div className="text-[11.5px] text-ink-faint">Satellite imagery, dark, street or terrain tiles</div>
              </div>
              <Segmented
                ariaLabel="Default basemap"
                value={settings.defaultBasemap}
                onChange={(v) => update({ defaultBasemap: v as BasemapId })}
                options={BASEMAP_LIST.map((b) => ({ value: b.id, label: b.label }))}
              />
            </div>
          ) : (
            <div className="h-7 w-40 animate-pulse rounded bg-card" />
          )}
        </Panel>

        {/* investigation defaults */}
        <Panel title="Investigation defaults" subtitle="Pre-selected in the new-investigation wizard">
          {settings ? (
            <div className="space-y-4">
              <Row
                label="Mode"
                hint="DEMO runs the marked demonstration workflow; REAL executes against uploaded imagery"
                control={
                  <Segmented
                    ariaLabel="Default mode"
                    value={settings.defaultMode}
                    onChange={(v) => update({ defaultMode: v as InvestigationMode })}
                    options={[
                      { value: 'real', label: 'REAL' },
                      { value: 'demo', label: 'DEMO' },
                    ]}
                  />
                }
              />
              <Row
                label="Evidence strictness"
                hint="Recorded with every investigation configuration"
                control={
                  <Segmented
                    ariaLabel="Default strictness"
                    value={settings.defaultStrictness}
                    onChange={(v) => update({ defaultStrictness: v as EvidenceStrictness })}
                    options={[
                      { value: 'standard', label: 'Standard' },
                      { value: 'strict', label: 'Strict' },
                      { value: 'research', label: 'Research' },
                    ]}
                  />
                }
              />
              <Row
                label="Analysis depth"
                hint="Fast · Balanced · Deep"
                control={
                  <Segmented
                    ariaLabel="Default depth"
                    value={settings.defaultDepth}
                    onChange={(v) => update({ defaultDepth: v as AnalysisDepth })}
                    options={[
                      { value: 'fast', label: 'Fast' },
                      { value: 'balanced', label: 'Balanced' },
                      { value: 'deep', label: 'Deep' },
                    ]}
                  />
                }
              />
            </div>
          ) : (
            <div className="h-7 w-40 animate-pulse rounded bg-card" />
          )}
        </Panel>

        {/* providers + models */}
        <Panel title="Data providers & models" subtitle="Availability comes from live system status">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/status" className="flex items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-[12.5px] text-ink-dim transition-colors hover:border-primary/50 hover:text-primary">
              <StatusDot state="not_configured" /> <Database className="h-3.5 w-3.5" /> Provider status
            </Link>
            <Link href="/models" className="flex items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-[12.5px] text-ink-dim transition-colors hover:border-primary/50 hover:text-primary">
              <StatusDot state="degraded" /> <Radar className="h-3.5 w-3.5" /> Model registry
            </Link>
            <span className="text-[12px] text-ink-faint">
              Providers that are not deployed are labelled NOT CONFIGURED throughout the app.
            </span>
          </div>
        </Panel>

        {/* security */}
        <Panel title="Security" subtitle="Session and local data">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12.5px] text-ink-dim">
              <ShieldCheck className="h-4 w-4 text-success/70" />
              Session tokens are stored in this browser only; the API verifies them server-side. Refresh happens
              automatically before expiry.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  clearLocalData();
                  toast({ variant: 'success', title: 'Local data cleared', description: 'Notifications, profiles and stored scopes removed.' });
                }}
              >
                Clear local data
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<LogOut className="h-3.5 w-3.5" />}
                onClick={() => {
                  signOut();
                  router.replace('/sign-in');
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, hint, control }: { label: string; hint: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <div>
        <div className="text-[13px] text-ink">{label}</div>
        <div className="text-[11.5px] text-ink-faint">{hint}</div>
      </div>
      {control}
    </div>
  );
}
