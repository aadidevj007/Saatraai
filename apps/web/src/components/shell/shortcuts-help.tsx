'use client';

/** Keyboard shortcut reference. */

import { Modal, Kbd } from '@/components/ui';

const GROUPS: Array<{ title: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    title: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Open command palette' },
      { keys: ['?'], label: 'Show this shortcut help' },
      { keys: ['Esc'], label: 'Close palette, drawer or modal' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { keys: ['N'], label: 'New investigation' },
      { keys: ['I'], label: 'Investigations' },
      { keys: ['M'], label: 'Map (opens latest investigation)' },
      { keys: ['E'], label: 'Evidence panel (in workspace)' },
      { keys: ['G'], label: 'Evidence graph' },
      { keys: ['R'], label: 'Reports' },
      { keys: ['O'], label: 'Overview' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { keys: ['1', '–', '4'], label: 'Switch workspace panel tabs' },
      { keys: ['Enter'], label: 'Submit question in the query bar' },
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" description="Shortcuts are ignored while typing in a field.">
      <div className="space-y-5">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">{group.title}</div>
            <ul className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-4 text-[12.5px]">
                  <span className="text-ink-dim">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
