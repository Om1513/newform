"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
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

  const removeItem = (itemValue: string) => {
    onChange(value.filter((v: string) => v !== itemValue));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between h-auto min-h-[48px] p-3 border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 hover:bg-slate-50"
        >
          <div className="flex flex-wrap gap-1 items-center">
            <AnimatePresence>
              {selected.length > 0 ? (
                selected.map((item) => (
                  <motion.span
                    key={item.value}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {item.label}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.value);
                      }}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))
              ) : (
                <span className="text-slate-500">{placeholder}</span>
              )}
            </AnimatePresence>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-h-60 overflow-auto"
        >
          <div className="p-2 space-y-1">
            {options.map((o: Opt) => {
              const checked = value.includes(o.value);
              return (
                <motion.label 
                  key={o.value} 
                  whileHover={{ backgroundColor: "rgb(248 250 252)" }}
                  className="flex items-center gap-3 rounded-md p-3 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c: boolean | "indeterminate") => {
                      if (c) onChange([...value, o.value]);
                      else onChange(value.filter((v: string) => v !== o.value));
                    }}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700">{o.label}</span>
                </motion.label>
              );
            })}
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
