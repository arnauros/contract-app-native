"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import { BlockMenu } from "./BlockMenu";
import { Plugin, PluginKey } from "@tiptap/pm/state";

interface TiptapProps {
  content: string;
  onUpdate?: (html: string) => void;
}

// Custom Node View
const BlockContainer = (node: Node, view: EditorView, getPos: () => number) => {
  const dom = document.createElement("div");
  const content = document.createElement("div");

  dom.classList.add("block-wrapper");
  content.classList.add("block-content");

  // Create React root and render BlockMenu
  const menuContainer = document.createElement("div");
  const root = createRoot(menuContainer);
  root.render(
    <BlockMenu editor={view.state.editor} block={{ node, pos: getPos() }} />
  );

  dom.appendChild(menuContainer);
  dom.appendChild(content);

  return {
    dom,
    contentDOM: content,
    destroy() {
      root.unmount();
    },
  };
};

const BlockExtension = Extension.create({
  name: "blockExtension",

  addNodeView() {
    return (props) =>
      BlockContainer(props.node, props.editor.view, props.getPos);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockExtension"),
        props: {
          handleDOMEvents: {
            dragover(view, event) {
              if (event) {
                event.preventDefault();
              }
              return false;
            },
            drop(view, event) {
              if (!event) return false;
              event.preventDefault();

              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })?.pos;

              if (!pos) return false;

              const draggedPos = parseInt(
                event.dataTransfer?.getData("text/plain") || "0"
              );
              if (!draggedPos) return false;

              const $from = view.state.doc.resolve(draggedPos);
              const node = view.state.doc.nodeAt(draggedPos);

              if (!node) return false;

              const tr = view.state.tr;
              tr.delete(draggedPos, draggedPos + node.nodeSize);
              tr.insert(pos, node);

              view.dispatch(tr);
              return true;
            },
          },
        },
      }),
    ];
  },
});

const Tiptap = ({ content, onUpdate }: TiptapProps) => {
  const editor = useEditor({
    extensions: [StarterKit, BlockExtension],
    content,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} />
    </div>
  );
};

export default Tiptap;
