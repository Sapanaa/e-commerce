import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { getCart, removeFromCart } from "@/lib/actions/cart";

export default async function CartPage() {
  noStore();

  const { items } = await getCart();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">
          Add items to your cart to see them here.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-white"
        >
          Browse products
        </Link>
      </main>
    );
  }

  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.variant.price) * item.quantity,
    0
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-xl font-semibold">SHOPPING CART</h1>

<Link
  href="/"
  className="mb-8 inline-block text-sm text-gray-500 hover:text-black"
>
  ← Continue shopping
</Link>


      <div className="space-y-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b pb-6"
          >
            {/* Left */}
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded bg-gray-100">
                {/* <Image
                  src={item.variant.productId ?? "/placeholder.png"}
                  alt={item.variant.sku}
                  fill
                  className="object-contain"
                /> */}
              </div>

              <div>
                <p className="font-medium">
                  {item.variant.sku ?? "Product"}
                </p>
                <p className="text-sm text-gray-500">
                  {item.variant.price} × {item.quantity}
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-6">
              <p className="font-medium">
                ${(Number(item.variant.price) * item.quantity).toFixed(2)}
              </p>

              <form action={removeFromCart.bind(null, item.id)}>
                <button
                  type="submit"
                  className="text-gray-400 hover:text-black"
                >
                  ×
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 flex items-center justify-between">
        <p className="text-lg font-medium">
          Total{" "}
          <span className="ml-2">
            ${total.toFixed(2)}
          </span>
        </p>

        <button className="rounded-full bg-gray-800 px-8 py-3 text-white hover:bg-black">
          CHECKOUT
        </button>
      </div>
    </main>
  );
}
