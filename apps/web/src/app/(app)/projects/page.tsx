'use client';

/** Projects — organize investigations into projects. */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, FolderOpen, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usePageTitle } from '@/components/shell/shell-context';
import { Badge, Button, EmptyState, ErrorState, Field, Input, LoadingState, Modal, Textarea } from '@/components/ui';
import { errorMessage, projectApi } from '@/lib/api';
import { useInvestigations, useProjects } from '@/lib/hooks/queries';
import { useToast } from '@/lib/state/toast';
import { timeAgo } from '@/lib/utils';

export default function ProjectsPage() {
  const router = useRouter();
  usePageTitle('Projects');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const projectsQuery = useProjects();
  const investigationsQuery = useInvestigations({ page: 1, page_size: 100 });

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of investigationsQuery.data?.items ?? []) {
      map.set(inv.project_id, (map.get(inv.project_id) ?? 0) + 1);
    }
    return map;
  }, [investigationsQuery.data]);

  const createMutation = useMutation({
    mutationFn: () => projectApi.create(name.trim(), description.trim() || undefined),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCreateOpen(false);
      setName('');
      setDescription('');
      toast({ variant: 'success', title: 'Project created', description: project.name });
    },
    onError: (error) => toast({ variant: 'error', title: 'Could not create project', description: errorMessage(error) }),
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
            <Boxes className="h-5 w-5 text-primary" /> Projects
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Investigations live inside projects — each owned by your account and enforced server-side.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          New project
        </Button>
      </div>

      <div className="mt-6">
        {projectsQuery.isPending ? (
          <LoadingState label="Loading projects…" rows={3} />
        ) : projectsQuery.isError ? (
          <ErrorState error={errorMessage(projectsQuery.error)} onRetry={() => projectsQuery.refetch()} />
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create a project to organize investigations by region, mission or study."
            action={{ label: 'New project', onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <article key={project.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-medium text-ink">{project.name}</h2>
                    <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-dim">
                      {project.description ?? 'No description.'}
                    </p>
                  </div>
                  <Badge tone="primary">{counts.get(project.id) ?? 0} inv.</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    created {timeAgo(project.created_at)}
                  </span>
                  <button
                    onClick={() => router.push(`/investigations?project=${project.id}`)}
                    className="flex items-center gap-1 text-[12px] text-primary hover:underline"
                  >
                    <FolderOpen className="h-3.5 w-3.5" /> View investigations
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        description="Projects group investigations, datasets and reports"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              disabled={name.trim().length === 0}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Project name" htmlFor="project-name">
            <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Coastal flood study 2026" autoFocus />
          </Field>
          <Field label="Description (optional)" htmlFor="project-desc">
            <Textarea id="project-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this project investigates…" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
