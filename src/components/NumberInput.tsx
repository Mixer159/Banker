"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  min?: number;
}

function formatWithSpaces(n: number): string {
  if (n === 0) return "";
  return n.toLocaleString("cs-CZ");
}

function parseFormatted(s: string): number {
  // Remove all spaces and non-breaking spaces, replace comma with dot
  const cleaned = s.replace(/[\s\u00a0]/g, "").replace(",", ".");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : Math.max(0, Math.floor(num));
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  className,
  id,
  min = 0,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState("");

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setRawText(value > 0 ? String(value) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = parseFormatted(rawText);
    onChange(Math.max(min, parsed));
  }, [rawText, onChange, min]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setRawText(raw);
      // Live update the value as user types
      const parsed = parseFormatted(raw);
      onChange(Math.max(min, parsed));
    },
    [onChange, min]
  );

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={isFocused ? rawText : formatWithSpaces(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}
