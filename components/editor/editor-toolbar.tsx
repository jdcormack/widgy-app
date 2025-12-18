"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import { useCallback, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Link,
} from "lucide-react";
import { $isListNode, ListNode } from "@lexical/list";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "p-1.5 rounded hover:bg-accent transition-colors",
        active && "bg-accent text-accent-foreground",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1 self-center" />;
}

export function EditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnorderedList, setIsUnorderedList] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);
  const [isHeading1, setIsHeading1] = useState(false);
  const [isHeading2, setIsHeading2] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));

        const anchorNode = selection.anchor.getNode();
        const element =
          anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElement();

        if (element) {
          const listNode = $getNearestNodeOfType(anchorNode, ListNode);
          const isInsideList = $isListNode(listNode);
          setIsUnorderedList(
            isInsideList && listNode?.getListType() === "bullet"
          );
          setIsOrderedList(
            isInsideList && listNode?.getListType() === "number"
          );

          const elementDOM = editor.getElementByKey(element.getKey());
          setIsHeading1(elementDOM?.tagName === "H1");
          setIsHeading2(elementDOM?.tagName === "H2");
        }

        // Check if selection is inside a link
        const parent = anchorNode.getParent();
        setIsLink($isLinkNode(parent));
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      1
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      1
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatBold = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  };

  const formatItalic = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  };

  const formatH1 = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h1"));
      }
    });
  };

  const formatH2 = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      }
    });
  };

  const formatBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const formatNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const insertLink = () => {
    if (isLink) {
      // Remove the link
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      // Open popover to get URL
      setLinkUrl("");
      setIsLinkPopoverOpen(true);
    }
  };

  const confirmLink = () => {
    if (linkUrl.trim()) {
      const url =
        linkUrl.startsWith("http://") || linkUrl.startsWith("https://")
          ? linkUrl
          : `https://${linkUrl}`;
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
    setIsLinkPopoverOpen(false);
    setLinkUrl("");
  };

  const onUndo = () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  };

  const onRedo = () => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
      <ToolbarButton onClick={onUndo} disabled={!canUndo} title="Undo">
        <Undo className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onRedo} disabled={!canRedo} title="Redo">
        <Redo className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={formatBold} active={isBold} title="Bold">
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={formatItalic} active={isItalic} title="Italic">
        <Italic className="size-4" />
      </ToolbarButton>
      <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "p-1.5 rounded hover:bg-accent transition-colors",
              isLink && "bg-accent text-accent-foreground"
            )}
            onClick={insertLink}
            title="Link"
          >
            <Link className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="flex flex-col gap-2">
            <label htmlFor="link-url" className="text-sm font-medium">
              Enter URL
            </label>
            <Input
              id="link-url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmLink();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLinkPopoverOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={confirmLink}>
                Add Link
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarDivider />

      <ToolbarButton onClick={formatH1} active={isHeading1} title="Heading 1">
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={formatH2} active={isHeading2} title="Heading 2">
        <Heading2 className="size-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={formatBulletList}
        active={isUnorderedList}
        title="Bullet List"
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={formatNumberedList}
        active={isOrderedList}
        title="Numbered List"
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
    </div>
  );
}
