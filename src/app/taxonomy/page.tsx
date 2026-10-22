"use client";

import { useEffect, useState } from "react";

type Node = { id: string; parentId: string | null; name: string; level: number; classCode?: string; materialGroup?: string; materialCount: number };
type ClassDef = { code: string; name: string; noun: string; namingTemplate: string; characteristics: { name: string; fieldKey: string; dataType: string; mandatory: boolean; unit?: string; enumValues?: string[] }[] };

export default function TaxonomyPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/taxonomy").then((r) => r.json()).then((d) => {
      setNodes(d.nodes);
      setClasses(d.classes);
    });
  }, []);

  function children(parentId: string | null) {
    return nodes.filter((n) => n.parentId === parentId);
  }

  function renderNode(node: Node) {
    const kids = children(node.id);
    return (
      <div key={node.id} style={{ marginLeft: node.level * 16 }}>
        <button
          onClick={() => node.classCode && setSelected(node.classCode)}
          className="flex items-center gap-2 py-1.5 px-2 rounded-md text-[13px] hover:bg-black/[0.03] w-full text-left"
          style={{ cursor: node.classCode ? "pointer" : "default" }}
        >
          <span className={node.classCode ? "font-semibold" : ""}>{node.name}</span>
          {node.classCode && (
            <>
              <span className="pill pill-accent">{node.classCode}</span>
              <span className="pill pill-neutral ml-auto">{node.materialCount} items</span>
            </>
          )}
        </button>
        {kids.map(renderNode)}
      </div>
    );
  }

  const cls = classes.find((c) => c.code === selected);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-[1100px]">
      <div className="card p-4">
        <h3 className="text-[13.5px] font-semibold mb-2 px-2">Taxonomy tree</h3>
        <p className="text-[11.5px] px-2 mb-3" style={{ color: "var(--muted)" }}>
          Config-driven — adding a category here means adding data, not new screens. Click a leaf to see its
          classification template.
        </p>
        {children(null).map(renderNode)}
      </div>

      <div className="card p-5">
        {!cls && (
          <div className="text-[13px] h-full flex items-center justify-center text-center py-16" style={{ color: "var(--muted)" }}>
            Select a class on the left to inspect its naming rule and characteristics.
          </div>
        )}
        {cls && (
          <>
            <h3 className="text-[14px] font-semibold mb-1">{cls.name}</h3>
            <div className="text-[11.5px] font-mono-ui mb-4" style={{ color: "var(--muted)" }}>
              Naming template: {cls.namingTemplate}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Characteristic</th>
                  <th>Type</th>
                  <th>Mandatory</th>
                </tr>
              </thead>
              <tbody>
                {cls.characteristics.map((ch) => (
                  <tr key={ch.fieldKey}>
                    <td className="font-medium">
                      {ch.name}
                      {ch.unit && <span style={{ color: "var(--muted)" }}> ({ch.unit})</span>}
                      {ch.enumValues && (
                        <div className="text-[10.5px]" style={{ color: "var(--muted)" }}>
                          {ch.enumValues.join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="capitalize">{ch.dataType}</td>
                    <td>{ch.mandatory ? <span className="pill pill-warn">Mandatory</span> : <span className="pill pill-neutral">Optional</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
