"use client";

import { useEffect, useCallback, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { EditorState, TextNode } from "lexical";
import { EditorToolbar } from "./editor-toolbar";

const theme = {
  ltr: "text-left",
  rtl: "text-right",
  paragraph: "relative mb-1 leading-normal",
  quote: "border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4",
  heading: {
    h1: "text-3xl font-bold my-4",
    h2: "text-2xl font-semibold my-3",
    h3: "text-xl font-medium my-2",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    underlineStrikethrough: "underline line-through",
  },
  list: {
    ul: "list-disc ml-4 my-2 space-y-1",
    ol: "list-decimal ml-4 my-2 space-y-1",
    listitem: "ml-4",
    nested: {
      listitem: "list-none",
    },
  },
  code: "bg-muted px-1.5 py-0.5 rounded font-mono text-sm",
  link: "text-primary underline hover:text-primary/80",
};

interface LexicalEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function InitialValuePlugin({
  value,
  hasInitialized,
}: {
  value: string;
  hasInitialized: React.MutableRefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!hasInitialized.current && value) {
      editor.update(() => {
        $convertFromMarkdownString(value, TRANSFORMERS);
      });
      hasInitialized.current = true;
    }
  }, [editor, value, hasInitialized]);

  return null;
}

function OnChangeMarkdownPlugin({
  onChange,
}: {
  onChange: (markdown: string) => void;
}) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        onChange(markdown);
      });
    },
    [onChange]
  );

  return <OnChangePlugin onChange={handleChange} />;
}

export function LexicalEditor({
  value,
  onChange,
  placeholder = "Enter description...",
  autoFocus = false,
}: LexicalEditorProps) {
  const hasInitialized = useRef(false);

  const initialConfig = {
    namespace: "CardDescriptionEditor",
    theme,
    nodes: [
      TextNode,
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      LinkNode,
      AutoLinkNode,
    ],
    onError(error: Error) {
      console.error("Lexical editor error:", error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative border rounded-md bg-background">
        <EditorToolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="outline-none p-3 min-h-32 prose prose-sm max-w-none dark:prose-invert" />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-muted-foreground pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        {autoFocus && <AutoFocusPlugin />}
        <ListPlugin />
        <LinkPlugin />
        <ClickableLinkPlugin newTab />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <InitialValuePlugin value={value} hasInitialized={hasInitialized} />
        <OnChangeMarkdownPlugin onChange={onChange} />
      </div>
    </LexicalComposer>
  );
}
