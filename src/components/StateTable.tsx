"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Client } from "@/lib/banker";

interface StateTableProps {
  clients: Client[];
  available: number;
}

export function StateTable({ clients, available }: StateTableProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white/80 backdrop-blur overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-amber-200 bg-amber-50/80">
            <TableHead className="text-amber-800 font-semibold">
              Klient
            </TableHead>
            <TableHead className="text-amber-800 font-semibold text-right">
              Přiděleno
            </TableHead>
            <TableHead className="text-amber-800 font-semibold text-right">
              Maximum
            </TableHead>
            <TableHead className="text-amber-800 font-semibold text-right">
              Potřebuje
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className="border-amber-100">
              <TableCell className="font-medium text-amber-900">
                {client.name}
              </TableCell>
              <TableCell className="text-right text-amber-800">
                {client.allocated.toLocaleString("cs-CZ")}
              </TableCell>
              <TableCell className="text-right text-amber-800">
                {client.max.toLocaleString("cs-CZ")}
              </TableCell>
              <TableCell className="text-right font-semibold text-orange-700">
                {client.need.toLocaleString("cs-CZ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="border-amber-200 bg-amber-50/60">
          <TableRow>
            <TableCell
              colSpan={3}
              className="font-semibold text-amber-800"
            >
              Dostupné
            </TableCell>
            <TableCell className="text-right font-bold text-amber-900">
              {available.toLocaleString("cs-CZ")}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
