# MkDocs 专题迁移的渲染兼容性

## 症状

把 Flink 和数仓面试资料接入专题阅读页后，文章页需要同时保留原始
Markdown、Mermaid、表格、代码片段、`details` 和 MkDocs 的 `???` / `!!!`
提示框语法。第一次接入时，生产预渲染失败；即使开发页能打开，原始
HTML 提示框也可能被当作文字显示。资料中的 SQL 模板 `${dt}`、`${today}`
还会被公式解析器误判为跨段数学表达式并产生 KaTeX 警告。

## 根因与修复

- 专题导航组件误调用自身，导致所有带侧栏的专题内容页在静态预渲染
  阶段返回 500。移除递归调用，并保留导航数据到链接组件的单向渲染。
- `remark-rehype` 允许原始 HTML 还不够；`rehype-stringify` 默认会把 raw
  节点转义。渲染器同时启用 `allowDangerousHtml`，让受版本控制的本地
  Markdown 中的 `<details>` 和转换后的 `<aside>` 保持为真实元素。
- 在渲染层把 MkDocs 提示框转换为原生 `details` / `aside`，递归渲染其
  缩进内容；`--8<--` 片段从同一专题的 `code/` 源树展开，并保留原文件。
- 在围栏外仅转义 `${...}` 占位符中的美元符号，避免 SQL 模板触发
  `remark-math`；真正的 Markdown 公式和围栏内代码不改写。

## 验证

- `npm run build` 成功，静态预渲染 84 个路由，且无 KaTeX 警告。
- `npm run lint` 通过。
- 浏览器检查确认 Flink 与数仓模块均能显示表格、提示框和 Mermaid SVG；
  Flink 代码页能显示完整源文件，专题入口包含两个卡片。
- 390px 移动端检查无横向溢出，文章内容和图表仍能加载。
- `content/collections/` 与原始 `Study/*/docs`、`code` 目录逐项对比无差异。

## 后续规则

Markdown 和代码源继续作为唯一事实来源。遇到单个图表过大、某种
MkDocs 扩展不兼容或静态导出异常时，优先在渲染器或页面样式中做局部
兼容处理，并在此目录追加记录；不要用生成后的 MkDocs `site/` 文件替代
源文件。
