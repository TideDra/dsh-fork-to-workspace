window.__ModuleLoader__.load({
  id: '@local/fork-to-workspace',
  factory(require) {
    const React = require('react');
    const store = require('@deepseek-ai/dsh-client-store');
    const h = React.createElement;

    const FORK_ROUTE = 'fork-to-workspace/fork';
    const NS = 'fork-to-workspace';

    const dicts = {
      zh: {
        menuLabel: '分叉到工作区…',
        modalTitle: '分叉会话到工作区',
        modalDesc: '为分叉后的新会话选择一个目标工作区（新会话将使用该工作区作为根目录）。',
        sourceLabel: '源会话',
        currentTag: '当前',
        addWorkspace: '选择其他文件夹…',
        emptyWorkspaces: '暂无可用工作区，请先添加一个文件夹。',
        cancel: '取消',
        confirm: '分叉并打开',
        forking: '正在分叉…',
        close: '关闭',
        errorMigration: '请先打开源会话完成格式迁移后再分叉。',
        errorNoTurn: '该会话还没有已完成的对话轮次，无法分叉。',
        errorGeneric: '分叉失败：{msg}',
      },
      en: {
        menuLabel: 'Fork to workspace…',
        modalTitle: 'Fork session to workspace',
        modalDesc: 'Choose a target workspace for the forked session (its working directory root will switch to that workspace).',
        sourceLabel: 'Source session',
        currentTag: 'Current',
        addWorkspace: 'Choose another folder…',
        emptyWorkspaces: 'No workspaces available yet. Choose a folder first.',
        cancel: 'Cancel',
        confirm: 'Fork & open',
        forking: 'Forking…',
        close: 'Close',
        errorMigration: 'Open the source session to finish migration before forking.',
        errorNoTurn: 'This session has no completed turn to fork from yet.',
        errorGeneric: 'Fork failed: {msg}',
      },
    };

    function increasedForkTitle(title) {
      const ascii = /^(.*?)\((\d+)\)$/u.exec(title);
      if (ascii?.[1] !== undefined && ascii[2] !== undefined) {
        return `${ascii[1]}(${BigInt(ascii[2]) + 1n})`;
      }
      const fullWidth = /^(.*?)（(\d+)）$/u.exec(title);
      if (fullWidth?.[1] !== undefined && fullWidth[2] !== undefined) {
        return `${fullWidth[1]}（${BigInt(fullWidth[2]) + 1n}）`;
      }
      return `${title} (1)`;
    }

    const CSS = `
.ftw-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  pointer-events: auto;
}
.ftw-dialog {
  width: 100%;
  max-width: 460px;
  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--dsw-font-family, inherit);
}
.ftw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 10px;
}
.ftw-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}
.ftw-close {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}
.ftw-close:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.14));
  color: var(--dsw-alias-label-primary);
}
.ftw-body {
  padding: 0 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ftw-desc {
  margin: 0;
  font-size: 13px;
  line-height: 19px;
  color: var(--dsw-alias-label-secondary);
}
.ftw-source {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ftw-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 2px;
}
.ftw-item {
  appearance: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: 10px;
  padding: 9px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: border-color 120ms ease, background-color 120ms ease;
}
.ftw-item:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
}
.ftw-item[data-selected="true"] {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.ftw-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ftw-item-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ftw-badge {
  flex: none;
  font-size: 11px;
  line-height: 16px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--dsw-alias-border-l1);
}
.ftw-item-path {
  font-size: 12px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ftw-add-btn {
  appearance: none;
  border: 1px dashed var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
  text-align: center;
}
.ftw-add-btn:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
}
.ftw-empty {
  font-size: 13px;
  color: var(--dsw-alias-label-secondary);
  padding: 10px 0;
  text-align: center;
}
.ftw-error {
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-state-error-primary);
}
.ftw-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.ftw-btn {
  appearance: none;
  border-radius: 9px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-primary);
}
.ftw-btn:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
}
.ftw-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.ftw-btn-primary {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-brand-primary);
  color: #fff;
}
.ftw-btn-primary:hover:not(:disabled) {
  filter: brightness(1.06);
  background: var(--dsw-alias-brand-primary);
}
`;

    function ForkIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 15,
          height: 15,
          fill: 'none',
          'aria-hidden': true,
        },
        h('circle', { cx: 4, cy: 3.5, r: 1.5, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('circle', { cx: 4, cy: 12.5, r: 1.5, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('circle', { cx: 12, cy: 8, r: 1.5, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('path', {
          d: 'M4 5V11M4 5C4 7 6.5 8 10.5 8',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
        })
      );
    }

    return {
      inject: ['slots', 'contextMenus', 'workspaces', 'sessions', 'uiWorkspace', 'locale', 'remoteAccess'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dicts), 'fork-to-workspace: locale');
        const t = ctx.locale.bind(NS);

        if (typeof document !== 'undefined') {
          const styleId = '@local/fork-to-workspace/styles';
          if (document.querySelector(`style[data-plugin-css="${styleId}"]`) === null) {
            const style = document.createElement('style');
            style.dataset.plugin = '@local/fork-to-workspace';
            style.dataset.pluginCss = styleId;
            style.textContent = CSS;
            document.head.appendChild(style);
            ctx.effect(() => () => style.remove(), 'fork-to-workspace: styles');
          }
        }

        const pendingRequest = store.createSnapshotStore(null);

        function usePendingRequest() {
          return React.useSyncExternalStore(
            (fn) => pendingRequest.subscribe(fn),
            () => pendingRequest.getSnapshot()
          );
        }

        function useWorkspaceList() {
          return React.useSyncExternalStore(
            (fn) => ctx.workspaces.list.subscribe(fn),
            () => ctx.workspaces.list.getSnapshot()
          );
        }

        ctx.slots.inject('contextMenu.icon', () =>
          ctx.slots.register({ name: 'contextMenu.icon', key: 'fork-to-workspace.icon' }, ForkIcon)
        );

        ctx.effect(
          () =>
            ctx.contextMenus.register({
              id: 'fork-to-workspace.action',
              target: 'session',
              order: 310,
              observe: ({ sessionId }) => [
                ctx.locale,
                ctx.remoteAccess.source('session', sessionId, 'session/fork'),
              ],
              resolve: (target) => {
                if (!ctx.remoteAccess.source('session', target.sessionId, 'session/fork').getSnapshot()) {
                  return [];
                }
                return [
                  {
                    id: 'fork-to-workspace',
                    label: t('menuLabel'),
                    icon: { key: 'fork-to-workspace.icon' },
                    run: () => {
                      pendingRequest.set({
                        sessionId: target.sessionId,
                        displayTitle: target.displayTitle || target.sessionId,
                      });
                    },
                  },
                ];
              },
            }),
          'fork-to-workspace: session menu'
        );

        function ForkToWorkspaceModal() {
          const req = usePendingRequest();
          const wsSnapshot = useWorkspaceList();
          const workspaces = wsSnapshot.items || [];

          const currentWorkspaceId = React.useMemo(() => {
            if (!req) return undefined;
            return workspaces.find((w) => Array.isArray(w.sessionIds) && w.sessionIds.includes(req.sessionId))
              ?.workspaceId;
          }, [req, workspaces]);

          const [selectedId, setSelectedId] = React.useState(undefined);
          const [submitting, setSubmitting] = React.useState(false);
          const [picking, setPicking] = React.useState(false);
          const [error, setError] = React.useState(null);

          React.useEffect(() => {
            if (!req) return;
            setError(null);
            setSubmitting(false);
            const fallback = workspaces.find((w) => w.workspaceId !== currentWorkspaceId)?.workspaceId ?? workspaces[0]?.workspaceId;
            setSelectedId(fallback);
          }, [req?.sessionId]);

          React.useEffect(() => {
            if (!req) return undefined;
            const onKeyDown = (e) => {
              if (e.key === 'Escape' && !submitting && !picking) {
                e.preventDefault();
                pendingRequest.set(null);
              }
            };
            window.addEventListener('keydown', onKeyDown);
            return () => window.removeEventListener('keydown', onKeyDown);
          }, [req, submitting, picking]);

          if (!req) return null;

          const close = () => {
            if (submitting || picking) return;
            pendingRequest.set(null);
          };

          const handleAddFolder = async () => {
            if (submitting || picking) return;
            setPicking(true);
            setError(null);
            try {
              const path = await ctx.uiWorkspace.pickDirectory();
              if (!path) return;
              const created = await ctx.workspaces.create({ path });
              if (created?.workspaceId) {
                setSelectedId(created.workspaceId);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setPicking(false);
            }
          };

          const handleConfirm = async () => {
            if (!selectedId || submitting || picking) return;
            setSubmitting(true);
            setError(null);
            try {
              const res = await fetch(FORK_ROUTE, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  sessionId: req.sessionId,
                  workspaceId: selectedId,
                  allowMigration: false,
                }),
              });
              const payload = await res.json().catch(() => ({}));
              if (!res.ok) {
                if (payload?.code === 'session/migration-required') {
                  throw new Error(t('errorMigration'));
                }
                if (payload?.code === 'session/fork-unavailable') {
                  throw new Error(t('errorNoTurn'));
                }
                throw new Error(payload?.message || `HTTP ${res.status}`);
              }

              const childId = payload.sessionId;
              const sourceTitle = ctx.sessions.list.getSnapshot().byId?.[req.sessionId]?.title;
              if (sourceTitle) {
                try {
                  await ctx.sessions.using(childId, { source: 'controllerOperation' }, async (ref) => {
                    await ref.binding.session.rename(increasedForkTitle(sourceTitle));
                  });
                } catch {}
              }

              pendingRequest.set(null);
              ctx.uiWorkspace.openSession(childId);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : t('errorGeneric', { msg: String(err) })
              );
            } finally {
              setSubmitting(false);
            }
          };

          return h(
            'div',
            {
              className: 'ftw-backdrop',
              role: 'presentation',
              onClick: (e) => {
                if (e.target === e.currentTarget) close();
              },
            },
            h(
              'div',
              {
                className: 'ftw-dialog',
                role: 'dialog',
                'aria-modal': true,
                'aria-labelledby': 'ftw-dialog-title',
              },
              h(
                'div',
                { className: 'ftw-header' },
                h('h2', { id: 'ftw-dialog-title', className: 'ftw-title' }, t('modalTitle')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ftw-close',
                    'aria-label': t('close'),
                    disabled: submitting || picking,
                    onClick: close,
                  },
                  '×'
                )
              ),
              h(
                'div',
                { className: 'ftw-body' },
                h('p', { className: 'ftw-desc' }, t('modalDesc')),
                h('div', { className: 'ftw-source', title: req.displayTitle }, `${t('sourceLabel')}: ${req.displayTitle}`),
                workspaces.length === 0
                  ? h('div', { className: 'ftw-empty' }, t('emptyWorkspaces'))
                  : h(
                      'div',
                      { className: 'ftw-list', role: 'listbox' },
                      workspaces.map((ws) => {
                        const selected = ws.workspaceId === selectedId;
                        const isCurrent = ws.workspaceId === currentWorkspaceId;
                        return h(
                          'button',
                          {
                            key: ws.workspaceId,
                            type: 'button',
                            role: 'option',
                            'aria-selected': selected,
                            'data-selected': selected ? 'true' : 'false',
                            className: 'ftw-item',
                            disabled: submitting || picking,
                            onClick: () => setSelectedId(ws.workspaceId),
                          },
                          h(
                            'div',
                            { className: 'ftw-item-top' },
                            h('span', { className: 'ftw-item-title' }, ws.title || ws.path),
                            isCurrent ? h('span', { className: 'ftw-badge' }, t('currentTag')) : null
                          ),
                          h('span', { className: 'ftw-item-path', title: ws.path }, ws.path)
                        );
                      })
                    ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ftw-add-btn',
                    disabled: submitting || picking,
                    onClick: handleAddFolder,
                  },
                  t('addWorkspace')
                ),
                error ? h('div', { className: 'ftw-error', role: 'alert' }, error) : null
              ),
              h(
                'div',
                { className: 'ftw-footer' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ftw-btn',
                    disabled: submitting || picking,
                    onClick: close,
                  },
                  t('cancel')
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ftw-btn ftw-btn-primary',
                    disabled: !selectedId || submitting || picking,
                    onClick: handleConfirm,
                  },
                  submitting ? t('forking') : t('confirm')
                )
              )
            )
          );
        }

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'fork-to-workspace.modal',
              order: 50,
            },
            ForkToWorkspaceModal
          )
        );
      },
    };
  },
});
