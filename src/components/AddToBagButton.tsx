"use client";

import { ShoppingBag } from "lucide-react";
import { addToCart } from "@/lib/actions/cart";
import { useTransition } from "react";

type Props = {
  productVariantId: string;
};

export default function AddToBagButton({ productVariantId }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await addToCart({ productVariantId });
        })
      }
      className="flex items-center justify-center gap-2 rounded-full bg-dark-900 px-6 py-4 text-body-medium text-light-100 transition hover:opacity-90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-dark-500]"
    >
      <ShoppingBag className="h-5 w-5" />
      {isPending ? "Adding…" : "Add to Bag"}
    </button>
  );
}
