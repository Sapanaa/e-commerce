"use server";

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, cartItems, productVariants, guests } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/actions";
import { unstable_noStore as noStore } from "next/cache";
import { revalidatePath } from "next/cache";

 // 🚨 force fresh data on every request

/**
 * INTERNAL
 * Get or create cart for authenticated user or guest
 */
async function getOrCreateCart() {
     noStore(); 
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  let guestSessionToken = cookieStore.get("guest_session")?.value;

  /**
   * 1️⃣ AUTHENTICATED USER CART
   */
  if (user) {
    const existingCart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });

    if (existingCart) return existingCart;

    const [newCart] = await db
      .insert(carts)
      .values({
        userId: user.id,
        guestId: null,
      })
      .returning();

    return newCart;
  }

  /**
   * 2️⃣ GUEST CART
   */
  let guest;
  if (!guestSessionToken) {
    guestSessionToken = crypto.randomUUID();

  cookieStore.set("guest_session", guestSessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    });
  

  const [newGuest] = await db
      .insert(guests)
      .values({
        sessionToken: guestSessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

    guest = newGuest;
  }
 else {
    // 🟢 Reuse existing guest
    guest = await db.query.guests.findFirst({
      where: eq(guests.sessionToken, guestSessionToken),
    });

    if (!guest) {
      throw new Error("Invalid guest session");
    }
  }
  const existingCart = await db.query.carts.findFirst({
    where: eq(carts.guestId, guest.id),
  });

  if (existingCart) return existingCart;

  const [newCart] = await db
    .insert(carts)
    .values({
      guestId: guest.id,
      userId: null,
    })
    .returning();

  return newCart;
}

/**
 * ADD ITEM TO CART
 */
export async function addToCart({
  productVariantId,
}: {
  productVariantId: string;
}) {
  // 🔒 Validate variant exists & is in stock
  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, productVariantId),
  });

  if (!variant) {
    throw new Error("Invalid product variant");
  }

  if (!variant.inStock) {
    throw new Error("Product is out of stock");
  }

  const cart = await getOrCreateCart();

  // 🔁 Check if item already exists
  const existingItem = await db.query.cartItems.findFirst({
    where: and(
      eq(cartItems.cartId, cart.id),
      eq(cartItems.productVariantId, productVariantId)
    ),
  });

  if (existingItem) {
    await db
      .update(cartItems)
      .set({ quantity: existingItem.quantity + 1 })
      .where(eq(cartItems.id, existingItem.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      productVariantId,
      quantity: 1,
    });
  }

  return { ok: true };
}

/**
 * GET CART (cart page / navbar count)
 */
export async function getCart() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const guestSessionToken = cookieStore.get("guest_session")?.value;

  let cart;

  if (user) {
    cart = await db.query.carts.findFirst({
      where: eq(carts.userId, user.id),
    });
  } else if (guestSessionToken) {
    const guest = await db.query.guests.findFirst({
      where: eq(guests.sessionToken, guestSessionToken),
    });

    if (guest) {
      cart = await db.query.carts.findFirst({
        where: eq(carts.guestId, guest.id),
      });
    }
  }

  if (!cart) {
    return { items: [], totalItems: 0 };
  }

  const items = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cart.id),
    with: {
      variant: true,
    },
  });

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, totalItems };
}

/**
 * REMOVE ITEM FROM CART
 */
export async function removeFromCart(cartItemId: string) {
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  revalidatePath("/cart");

}

/**
 * UPDATE ITEM QUANTITY
 */
export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
) {
  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  } else {
    await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, cartItemId));
  }

  return { ok: true };
}
