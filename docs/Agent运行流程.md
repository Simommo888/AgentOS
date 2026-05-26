# Agent 运行流程

标准流程：

注册 Agent → 配置 Agent → 手动运行 / 定时运行 → 查看日志 → 查看输出 → 沉淀到知识库

## 运行步骤

1. AgentOS 从数据库读取 Agent 配置。
2. Runner 校验 entrypoint 是否在允许目录内。
3. Runner 根据 command 拼接安全命令。
4. 使用 `subprocess.run(..., shell=False)` 执行本地 Python 脚本。
5. 捕获 stdout 和 stderr。
6. 写入 `AgentRun`。
7. 写入 `AgentLog`。
8. 扫描 `output_path` 中新增的 Markdown 文件。
9. 写入 `KnowledgeAsset`。
10. 更新 Agent 的 `last_run_status` 和 `last_run_at`。

如果脚本失败，平台记录错误，不会崩溃。
