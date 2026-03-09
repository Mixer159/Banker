"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/AnimatedNumber";

interface ClientCardSetupProps {
  id: number;
  name: string;
  max: number;
  allocated: number;
  need: number;
  onChangeMax: (val: number) => void;
  onChangeAllocated: (val: number) => void;
  onRemove: () => void;
}

export function ClientCardSetup({
  id,
  name,
  max,
  allocated,
  need,
  onChangeMax,
  onChangeAllocated,
  onRemove,
}: ClientCardSetupProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateY(((x - centerX) / centerX) * 8);
    setRotateX(((centerY - y) / centerY) * 8);
  }

  function handleMouseLeave() {
    setRotateX(0);
    setRotateY(0);
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        perspective: 800,
      }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{ rotateX, rotateY }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <Card className="border-amber-200 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-amber-900 font-bold text-lg">
              {name}
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRemove}
                className="text-amber-400 hover:text-red-500 hover:bg-red-50"
              >
                <X className="size-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`max-${id}`} className="text-amber-800 text-xs">
                Maximum
              </Label>
              <Input
                id={`max-${id}`}
                type="number"
                min={0}
                value={max}
                onChange={(e) => onChangeMax(Number(e.target.value) || 0)}
                className="border-amber-200 focus-visible:border-amber-400 focus-visible:ring-amber-200"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`alloc-${id}`} className="text-amber-800 text-xs">
                Přiděleno
              </Label>
              <Input
                id={`alloc-${id}`}
                type="number"
                min={0}
                value={allocated}
                onChange={(e) => onChangeAllocated(Number(e.target.value) || 0)}
                className="border-amber-200 focus-visible:border-amber-400 focus-visible:ring-amber-200"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
              <span className="text-xs font-medium text-amber-700">Potřebuje</span>
              <AnimatedNumber
                value={need}
                className="text-lg font-bold text-amber-900"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
