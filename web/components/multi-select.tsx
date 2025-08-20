"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Opt = { label: string; value: string };

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options"
}: {
  options: Opt[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.filter((o: Opt) => value.includes(o.value));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className={cn("truncate", selected.length ? "" : "text-neutral-500")}>
            {selected.length ? selected.map((s: Opt) => s.label).join(", ") : placeholder}
          </span>
          <span className="text-neutral-400">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="max-h-56 overflow-auto space-y-1">
          {options.map((o: Opt) => {
            const checked = value.includes(o.value);
            return (
              <label key={o.value} className="flex items-center gap-2 rounded-md p-2 hover:bg-neutral-50 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c: boolean | "indeterminate") => {
                    if (c) onChange([...value, o.value]);
                    else onChange(value.filter((v: string) => v !== o.value));
                  }}
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
