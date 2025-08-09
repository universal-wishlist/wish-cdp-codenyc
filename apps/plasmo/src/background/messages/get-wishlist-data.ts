import { supabase } from "@/core/supabase"

import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.send({ success: false, error: "User not found" })
  }

  try {
    const { data: wishlistData, error: wishlistError } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .single()

    if (wishlistError) throw wishlistError

    const { data: itemsData, error: itemsError } = await supabase
      .from("wishlist_items")
      .select(
        `
        id,
        created_at,
        products (
          id,
          title,
          brand,
          source_url,
          category,
          image_url,
          prices (
            amount,
            source_url,
            created_at
          )
        )
      `
      )
      .eq("wishlist_id", wishlistData.id)
      .order("created_at", { ascending: false })

    if (itemsError) throw itemsError

    const storage = new Storage({ area: "local" })

    await storage.set("wishlistId", wishlistData.id)
    const formattedItems = (itemsData || []).map((item: any) => ({
      id: item.products.id,
      wishlist_item_id: item.id,
      title: item.products.title,
      brand: item.products.brand,
      source_url: item.products.source_url,
      category: item.products.category,
      image_url: item.products.image_url,
      created_at: item.created_at,
      price: item.products.prices?.[0]?.amount || null,
      prices: item.products.prices || []
    }))

    await storage.set("wishlistItems", formattedItems)

    res.send({ success: true })
  } catch (error) {
    res.send({ success: false, error: error.message })
  }
}

export default handler
