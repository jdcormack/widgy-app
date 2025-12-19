"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { LexicalEditor } from "@/components/editor";
import {
  Check,
  ChevronsUpDown,
  LayoutGrid,
  SquareDashedBottom,
  UserIcon,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type OrganizationMember } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  MemberAvatar,
  getMemberDisplayName,
  getAuthorDisplayInfo,
} from "./card-details";

const formSchema = z.object({
  title: z.string().max(200, "Title is too long"),
  description: z.string(),
  boardId: z.string().optional(),
  assignedTo: z.string().optional(),
});

export type CardEditFormValues = z.infer<typeof formSchema>;

interface Board {
  _id: string;
  name: string;
}

interface Card {
  _id: string;
  title: string;
  description: string;
  boardId?: string;
  assignedTo?: string;
  authorId: string;
}

interface CardEditFormProps {
  card: Card;
  boards: Board[];
  members: OrganizationMember[];
  onSubmit: (values: CardEditFormValues) => Promise<void>;
  onCancel: () => void;
}

interface AssigneeComboboxProps {
  members: OrganizationMember[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

function AssigneeCombobox({ members, value, onChange }: AssigneeComboboxProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const selectedMember = members.find((m) => m.userId === value);

  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between"
    >
      <span className="flex items-center gap-2">
        {selectedMember ? (
          <>
            <MemberAvatar member={selectedMember} className="h-6 w-6" />
            {getMemberDisplayName(selectedMember)}
          </>
        ) : (
          <>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Unassigned</span>
          </>
        )}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  const memberList = (
    <Command>
      <CommandInput placeholder="Search members..." />
      <CommandList>
        <CommandEmpty>No members found.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="__unassigned__"
            onSelect={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            Unassigned
            <Check
              className={cn(
                "ml-auto h-4 w-4",
                !value ? "opacity-100" : "opacity-0"
              )}
            />
          </CommandItem>
          {members.map((member) => (
            <CommandItem
              key={member.userId}
              value={getMemberDisplayName(member)}
              onSelect={() => {
                onChange(member.userId);
                setOpen(false);
              }}
            >
              <MemberAvatar member={member} className="mr-2 h-6 w-6" />
              {getMemberDisplayName(member)}
              <Check
                className={cn(
                  "ml-auto h-4 w-4",
                  value === member.userId ? "opacity-100" : "opacity-0"
                )}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          {memberList}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">Select assignee</DrawerTitle>
        <div className="mt-4 border-t">{memberList}</div>
      </DrawerContent>
    </Drawer>
  );
}

interface BoardComboboxProps {
  boards: Board[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

function BoardCombobox({ boards, value, onChange }: BoardComboboxProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const selectedBoard = boards.find((b) => b._id === value);

  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between"
    >
      <span className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        {selectedBoard ? (
          <span>{selectedBoard.name}</span>
        ) : (
          <span className="text-muted-foreground">No board (untriaged)</span>
        )}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  const boardList = (
    <Command>
      <CommandInput placeholder="Search boards..." />
      <CommandList>
        <CommandEmpty>No boards found.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="__no_board__"
            onSelect={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            <SquareDashedBottom className="mr-2 h-4 w-4 text-muted-foreground" />
            Unassigned
            <Check
              className={cn(
                "ml-auto h-4 w-4",
                !value ? "opacity-100" : "opacity-0"
              )}
            />
          </CommandItem>
          {boards.map((board) => (
            <CommandItem
              key={board._id}
              value={board.name}
              onSelect={() => {
                onChange(board._id);
                setOpen(false);
              }}
            >
              <LayoutGrid className="mr-2 h-4 w-4 text-muted-foreground" />
              {board.name}
              <Check
                className={cn(
                  "ml-auto h-4 w-4",
                  value === board._id ? "opacity-100" : "opacity-0"
                )}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          {boardList}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">Select board</DrawerTitle>
        <div className="mt-4 border-t">{boardList}</div>
      </DrawerContent>
    </Drawer>
  );
}

export function CardEditForm({
  card,
  boards,
  members,
  onSubmit,
  onCancel,
}: CardEditFormProps) {
  const authorInfo = getAuthorDisplayInfo(card.authorId, members);

  const form = useForm<CardEditFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: card.title ?? "",
      description: card.description ?? "",
      boardId: card.boardId ?? undefined,
      assignedTo: card.assignedTo ?? undefined,
    },
  });

  const handleSubmit = async (values: CardEditFormValues) => {
    await onSubmit(values);
    onCancel();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter card title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <LexicalEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter card description..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <FormControl>
                    <AssigneeCombobox
                      members={members}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Read-only Author Display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Created by</span>
              {authorInfo.isFeedbackUser ? (
                <>
                  <span className="text-foreground">
                    {authorInfo.displayName}
                  </span>
                  <Badge variant="secondary">Public</Badge>
                </>
              ) : authorInfo.member ? (
                <>
                  <MemberAvatar
                    member={authorInfo.member}
                    className="h-6 w-6"
                  />
                  <span className="text-foreground">
                    {authorInfo.displayName}
                  </span>
                </>
              ) : (
                <span>Unknown</span>
              )}
            </div>

            <FormField
              control={form.control}
              name="boardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Board</FormLabel>
                  <FormControl>
                    <BoardCombobox
                      boards={boards}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
