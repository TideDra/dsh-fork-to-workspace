# dsh-fork-to-workspace

[English](README.md) | 中文

这是一个用于 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的插件包（Cordis Bundle），支持在**分叉普通会话**时直接指定并切换到另一个工作区（Workspace），从而改变分叉后新会话的根目录（`cwd`）并将其挂载到目标工作区。

## 功能特性

- 在左侧会话列表的右键 / `...` 菜单中增加 **「分叉到工作区…」**（位于内置「分叉」下方）。
- 弹出工作区选择对话框，展示所有已有工作区，并支持通过「选择其他文件夹…」新建并选中目录。
- 从源会话最后一个已完成的对话轮次（`turn/end`）处构造分叉种子，继承源会话的 Agent Preset、递增会话标题（如 ` (1)`），将新会话的 `meta.cwd` 设为目标工作区路径并自动打开。
- Host 端接口 `POST /fork-to-workspace/fork` 受 `ctx.connection.requestRejection(req)` 鉴权保护。

## 安装方式

将本仓库克隆到本地后，在 DSH 中通过插件管理器将仓库目录作为本地 Bundle 安装到当前 profile（也可直接让 DSH Agent 调用 `plugin_manager` 的 `install_bundle` 指向克隆目录）：

```bash
git clone https://github.com/TideDra/dsh-fork-to-workspace.git
```

## 目录结构

- `package.json` — 插件包清单，声明 Host/Client 入口、多语言与图标导出
- `cordis.patch.yml` — Cordis 装配补丁，注册 `fork-to-workspace`
- `index.js` — Host 端实现，提供 `POST /fork-to-workspace/fork` 接口并基于目标工作区 `cwd` 创建分叉会话
- `client.js` — Web UI 实现，注册会话右键菜单项与工作区选择弹窗
- `locale/en.json`、`locale/zh.json` — 插件多语言元信息
- `icon.svg` — 插件图标

## 注意事项

- 仅支持分叉至少包含一轮已完成对话的普通会话，不支持分叉 subagent 会话。
- 若源会话存在待迁移的旧格式（`migration-required`），需先打开一次源会话完成迁移后再分叉。
- 分叉后的新会话会保留原会话的历史对话记录，但新会话的工作区根目录（`header.cwd`）与可写沙箱范围会切换到所选的新工作区。

## 许可证

[MIT](LICENSE)
