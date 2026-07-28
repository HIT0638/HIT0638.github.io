"use client";

import { useEffect } from "react";

export default function MermaidRenderer() {
  useEffect(() => {
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".article-body pre code.language-mermaid",
      ),
    );

    if (blocks.length === 0) return;

    let cancelled = false;
    const pageId = window.location.pathname.replace(/[^a-zA-Z0-9_-]/g, "-");

    async function renderBlocks() {
      const { default: mermaid } = await import("mermaid");

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
          themeVariables: {
            background: "#f1eee8",
            primaryColor: "#e7e1d8",
            primaryTextColor: "#111111",
            primaryBorderColor: "#466c83",
            lineColor: "#466c83",
          secondaryColor: "#f8d7bf",
          tertiaryColor: "#dce7ed",
          fontFamily: '"Avenir Next", "PingFang SC", sans-serif',
        },
      });

        for (const [index, code] of blocks.entries()) {
          if (cancelled) return;

          const pre = code.closest("pre");
          if (!pre || pre.dataset.mermaidRendered === "true") continue;

          const source = code.textContent ?? "";
          const diagramId = `article-mermaid-${pageId}-${index}`;
          const title = source.match(/^\s*accTitle:\s*(.+)$/m)?.[1].trim();
          const compactTitles = new Set([
            "Omega Frequency Dependence",
            "Pairwise Relation Posterior",
            "Tree MCMC Proposal",
          ]);

          try {
            const { svg, bindFunctions } = await mermaid.render(
              diagramId,
              source,
            );

          if (cancelled) return;

            const diagram = document.createElement("div");
            diagram.className = compactTitles.has(title ?? "")
              ? "article-mermaid article-mermaid-compact"
              : "article-mermaid";
            diagram.setAttribute("role", "img");
          diagram.innerHTML = svg;
          pre.dataset.mermaidRendered = "true";
          pre.replaceWith(diagram);
          bindFunctions?.(diagram);
        } catch (error) {
          pre.dataset.mermaidError = "true";
          console.error("Unable to render Mermaid diagram", error);
        }
      }
    }

    void renderBlocks();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
