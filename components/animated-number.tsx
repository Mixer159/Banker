"use client"

import * as React from "react"
import { useSpring, useTransform, motion, type SpringOptions } from "motion/react"

const spring: SpringOptions = { stiffness: 200, damping: 30 }

export function AnimatedNumber({
  value,
  suffix = "",
  className,
}: {
  value: number
  suffix?: string
  className?: string
}) {
  const motionValue = useSpring(value, spring)
  const display = useTransform(motionValue, (v) =>
    Math.round(v).toLocaleString("cs-CZ"),
  )

  React.useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return (
    <span className={className}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}
