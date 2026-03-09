"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HandCoins, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client } from "@/lib/banker";

interface RequestFormProps {
  clients: Client[];
  onSubmit: (clientIndex: number, amount: number) => void;
}

export function RequestForm({ clients, onSubmit }: RequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [amount, setAmount] = useState("");

  function handleSubmit() {
    if (selectedClient === null) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    onSubmit(selectedClient, numAmount);
    setSelectedClient(null);
    setAmount("");
    setIsOpen(false);
  }

  function handleCancel() {
    setSelectedClient(null);
    setAmount("");
    setIsOpen(false);
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="trigger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-full h-12 gap-2 rounded-xl bg-amber-600 text-white font-semibold shadow-lg hover:bg-amber-700 hover:shadow-xl transition-all"
            >
              <HandCoins className="size-5" />
              Nová žádost o půjčku
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border-2 border-amber-200 bg-white/90 backdrop-blur p-5 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                <HandCoins className="size-5 text-amber-600" />
                Nová žádost o půjčku
              </h3>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCancel}
                className="text-amber-400 hover:text-red-500 hover:bg-red-50"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Client selector */}
            <div className="space-y-2">
              <Label className="text-amber-800 text-sm">Vyberte klienta</Label>
              <div className="grid grid-cols-2 gap-2">
                {clients.map((client, index) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(index)}
                    className={`rounded-lg border-2 px-3 py-2 text-left transition-all ${
                      selectedClient === index
                        ? "border-amber-500 bg-amber-50 shadow-sm"
                        : "border-amber-200 bg-white hover:border-amber-300 hover:bg-amber-50/50"
                    }`}
                  >
                    <span className="font-semibold text-amber-900 text-sm">
                      {client.name}
                    </span>
                    <span className="block text-xs text-amber-600">
                      potřeba: {client.need.toLocaleString("cs-CZ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-1">
              <Label htmlFor="request-amount" className="text-amber-800 text-sm">
                Částka
              </Label>
              <Input
                id="request-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Zadejte částku..."
                className="border-amber-200 focus-visible:border-amber-400 focus-visible:ring-amber-200"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={selectedClient === null || !amount || Number(amount) <= 0}
                className="flex-1 gap-2 bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                <Send className="size-4" />
                Odeslat žádost
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                Zrušit
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
