"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  suffix?: string;
}

export function AnimatedNumber({ value, className, suffix = "" }: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) =>
    `${Math.round(v).toLocaleString("cs-CZ")}${suffix}`
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
