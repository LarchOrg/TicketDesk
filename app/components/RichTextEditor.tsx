import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo,
  Underline,
  Undo,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
    quote: false,
  });
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isUpdatingRef = useRef(false);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const savedSelectionRef = useRef<Range | null>(null);

  // Save current selection
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore saved selection
  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current && editorRef.current) {
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelectionRef.current);
        }
      } catch (error) {
        console.debug("Could not restore selection:", error);
      }
    }
  }, []);

  const syncFromDom = useCallback(() => {
    if (!editorRef.current || isUpdatingRef.current) return;

    const html = editorRef.current.innerHTML;
    // Normalize empty content
    const normalizedHtml =
      html === "<br>" || html === "<div><br></div>" ? "" : html;

    if (normalizedHtml !== value) {
      // Add to undo stack
      if (value && value !== normalizedHtml) {
        undoStack.current.push(value);
        // Limit undo stack size
        if (undoStack.current.length > 50) {
          undoStack.current.shift();
        }
        // Clear redo stack when new content is added
        redoStack.current = [];
      }
      onChange(normalizedHtml);
    }
  }, [value, onChange]);

  const updateActiveStates = useCallback(() => {
    if (!editorRef.current) return;

    try {
      // Check if we're in a blockquote
      const selection = window.getSelection();
      let isInBlockquote = false;

      if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === "BLOCKQUOTE") {
            isInBlockquote = true;
            break;
          }
          node = node.parentNode;
        }
      }

      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        ul: document.queryCommandState("insertUnorderedList"),
        ol: document.queryCommandState("insertOrderedList"),
        quote: isInBlockquote,
      });
    } catch (error) {
      // Ignore errors from queryCommandState
      console.debug("queryCommandState error:", error);
    }
  }, []);

  const handleBlockquote = useCallback(() => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Check if we're already in a blockquote
    let node = selection.anchorNode;
    let blockquoteNode: Node | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeName === "BLOCKQUOTE") {
        blockquoteNode = node;
        break;
      }
      node = node.parentNode;
    }

    if (blockquoteNode) {
      // Remove blockquote - unwrap the content
      const parent = blockquoteNode.parentNode;
      if (parent) {
        while (blockquoteNode.firstChild) {
          parent.insertBefore(blockquoteNode.firstChild, blockquoteNode);
        }
        parent.removeChild(blockquoteNode);
      }
    } else {
      // Add blockquote
      try {
        document.execCommand("formatBlock", false, "blockquote");
      } catch (error) {
        console.error("formatBlock failed:", error);
      }
    }

    saveSelection();
    requestAnimationFrame(() => {
      syncFromDom();
      updateActiveStates();
    });
  }, [restoreSelection, saveSelection, syncFromDom, updateActiveStates]);

  const handleCommand = useCallback(
    (command: string, commandValue?: string) => {
      if (!editorRef.current) return;

      // Focus the editor first
      editorRef.current.focus();

      // Restore selection if we have one saved
      restoreSelection();

      // Execute the command
      try {
        const success = document.execCommand(command, false, commandValue);
        console.log(`Command ${command} executed:`, success);
      } catch (error) {
        console.error("execCommand failed:", error);
      }

      // Save the new selection
      saveSelection();

      // Update content and states
      requestAnimationFrame(() => {
        syncFromDom();
        updateActiveStates();
      });
    },
    [restoreSelection, saveSelection, syncFromDom, updateActiveStates]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;

    const previousValue = undoStack.current.pop()!;
    redoStack.current.push(value);

    isUpdatingRef.current = true;
    if (editorRef.current) {
      editorRef.current.innerHTML = previousValue;
    }
    onChange(previousValue);

    setTimeout(() => {
      isUpdatingRef.current = false;
      updateActiveStates();
    }, 0);
  }, [value, onChange, updateActiveStates]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;

    const nextValue = redoStack.current.pop()!;
    undoStack.current.push(value);

    isUpdatingRef.current = true;
    if (editorRef.current) {
      editorRef.current.innerHTML = nextValue;
    }
    onChange(nextValue);

    setTimeout(() => {
      isUpdatingRef.current = false;
      updateActiveStates();
    }, 0);
  }, [value, onChange, updateActiveStates]);

  const handleContentChange = useCallback(() => {
    if (isUpdatingRef.current) return;
    saveSelection();
    syncFromDom();
    updateActiveStates();
  }, [saveSelection, syncFromDom, updateActiveStates]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      requestAnimationFrame(() => {
        syncFromDom();
        updateActiveStates();
      });
    },
    [syncFromDom, updateActiveStates]
  );

  const openLinkDialog = useCallback(() => {
    saveSelection();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const selectedText = selection.toString();
      setLinkText(selectedText);
    }

    setLinkUrl("");
    setShowLinkDialog(true);
  }, [saveSelection]);

  const handleInsertLink = useCallback(() => {
    if (!linkUrl) return;

    setShowLinkDialog(false);

    // Restore focus and selection
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const selectedText = selection.toString();

        if (selectedText) {
          // If there's selected text, create link with it
          handleCommand("createLink", linkUrl);
        } else if (linkText) {
          // If no selection but we have link text, insert it
          document.execCommand(
            "insertHTML",
            false,
            `<a href="${linkUrl}">${linkText}</a>`
          );
          saveSelection();
          syncFromDom();
          updateActiveStates();
        }
      }
    }

    setLinkUrl("");
    setLinkText("");
  }, [
    linkUrl,
    linkText,
    restoreSelection,
    handleCommand,
    saveSelection,
    syncFromDom,
    updateActiveStates,
  ]);

  const handleCancelLink = useCallback(() => {
    setShowLinkDialog(false);
    setLinkUrl("");
    setLinkText("");

    // Restore focus
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
    }
  }, [restoreSelection]);

  // Initialize editor content on mount
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      isUpdatingRef.current = true;
      editorRef.current.innerHTML = value;
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, []);

  // Update editor content when value prop changes (but not during internal updates)
  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (editorRef.current && value !== editorRef.current.innerHTML) {
      isUpdatingRef.current = true;

      // Save current cursor position
      const selection = window.getSelection();
      let cursorPosition = 0;
      if (
        selection &&
        selection.rangeCount > 0 &&
        editorRef.current.contains(selection.anchorNode)
      ) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editorRef.current);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        cursorPosition = preCaretRange.toString().length;
      }

      editorRef.current.innerHTML = value || "";

      // Restore cursor position if editor is focused
      if (isFocused && cursorPosition > 0) {
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          let charCount = 0;
          let nodeStack: Node[] = [editorRef.current];
          let node: Node | undefined;
          let foundStart = false;

          while (!foundStart && (node = nodeStack.pop())) {
            if (node.nodeType === Node.TEXT_NODE) {
              const textNode = node as Text;
              const nextCharCount = charCount + textNode.length;
              if (cursorPosition <= nextCharCount) {
                range.setStart(textNode, cursorPosition - charCount);
                range.collapse(true);
                foundStart = true;
              }
              charCount = nextCharCount;
            } else {
              let i = node.childNodes.length;
              while (i--) {
                nodeStack.push(node.childNodes[i]);
              }
            }
          }

          if (foundStart && sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (error) {
          console.debug("Could not restore cursor position:", error);
        }
      }

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [value, isFocused]);

  // Update active states on selection change
  useEffect(() => {
    const updateStates = () => {
      if (isFocused) {
        updateActiveStates();
      }
    };

    document.addEventListener("selectionchange", updateStates);
    return () => document.removeEventListener("selectionchange", updateStates);
  }, [isFocused, updateActiveStates]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Ctrl/Cmd + B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        handleCommand("bold");
      }
      // Ctrl/Cmd + I for italic
      else if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        handleCommand("italic");
      }
      // Ctrl/Cmd + U for underline
      else if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        handleCommand("underline");
      }
      // Ctrl/Cmd + K for link
      else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openLinkDialog();
      }
      // Ctrl/Cmd + Z for undo
      else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z for redo
      else if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    },
    [handleCommand, openLinkDialog, handleUndo, handleRedo]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    updateActiveStates();
  }, [updateActiveStates]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    saveSelection();
  }, [saveSelection]);

  const handleMouseUp = useCallback(() => {
    saveSelection();
    updateActiveStates();
  }, [saveSelection, updateActiveStates]);

  const handleKeyUp = useCallback(() => {
    saveSelection();
    updateActiveStates();
  }, [saveSelection, updateActiveStates]);

  return (
    <>
      <div
        className={`relative rounded-md border border-border bg-card ${className || ""}`}
      >
        {/* Toolbar */}
        <div
          role="toolbar"
          aria-label="Formatting"
          className="flex items-center gap-1 border-b border-border bg-muted/30 p-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCommand("bold");
            }}
            aria-pressed={active.bold}
            title="Bold (Ctrl+B)"
            className={`h-8 w-8 p-0 ${active.bold ? "bg-primary/20" : ""}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCommand("italic");
            }}
            aria-pressed={active.italic}
            title="Italic (Ctrl+I)"
            className={`h-8 w-8 p-0 ${active.italic ? "bg-primary/20" : ""}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCommand("underline");
            }}
            aria-pressed={active.underline}
            title="Underline (Ctrl+U)"
            className={`h-8 w-8 p-0 ${active.underline ? "bg-primary/20" : ""}`}
          >
            <Underline className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCommand("insertUnorderedList");
            }}
            aria-pressed={active.ul}
            title="Bullet List"
            className={`h-8 w-8 p-0 ${active.ul ? "bg-primary/20" : ""}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCommand("insertOrderedList");
            }}
            aria-pressed={active.ol}
            title="Numbered List"
            className={`h-8 w-8 p-0 ${active.ol ? "bg-primary/20" : ""}`}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleBlockquote();
            }}
            aria-pressed={active.quote}
            title="Quote"
            className={`h-8 w-8 p-0 ${active.quote ? "bg-primary/20" : ""}`}
          >
            <Quote className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              openLinkDialog();
            }}
            title="Add Link (Ctrl+K)"
            className="h-8 w-8 p-0"
          >
            <Link className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleUndo();
            }}
            disabled={undoStack.current.length === 0}
            title="Undo (Ctrl+Z)"
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleRedo();
            }}
            disabled={redoStack.current.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label="Description"
          onInput={handleContentChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseUp={handleMouseUp}
          onKeyUp={handleKeyUp}
          className={`min-h-[120px] rounded-b-md p-3 outline-none focus:ring-2 focus:ring-ring ${
            !value && !isFocused ? "text-muted-foreground" : "text-foreground"
          }`}
          style={{
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
          suppressContentEditableWarning={true}
        />

        {/* Placeholder */}
        {!value && !isFocused && placeholder && (
          <div className="absolute top-[60px] left-3 right-3 pointer-events-none text-muted-foreground text-sm">
            {placeholder}
          </div>
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogClose onClick={handleCancelLink} />
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a link to your text. Enter the URL and optionally customize
              the link text.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                placeholder="Enter link text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInsertLink();
                  }
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelLink}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInsertLink}
              disabled={!linkUrl}
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
