# Mermaid 图表在专题页面切换后不渲染

## 症状

直接打开某个专题模块时 Mermaid 图表可以渲染；从一个 LXX 模块点击进入
另一个模块后，页面只显示 `flowchart` / `sequenceDiagram` 源代码，代码块
没有转换成 SVG。

## 根因

`MermaidRenderer` 的 `useEffect` 使用空依赖数组，只在客户端组件第一次挂载
时扫描 `.language-mermaid` 代码块。专题模块切换会更新文章内容，但客户端
组件可能被 React 复用，因此不会再次扫描新的代码块。

## 修复

使用当前路由路径作为 effect 依赖。每次专题页面路径变化时，渲染器都会重新
扫描并转换当前页面的 Mermaid 代码块；文章源文件和 Mermaid 源码保持不变。

## 验证

- 从 L01 点击进入 L02，确认 9 个 Mermaid 代码块均转换为 SVG。
- 直接打开 L01–L07，确认没有渲染错误。
- 运行专题静态构建检查。
