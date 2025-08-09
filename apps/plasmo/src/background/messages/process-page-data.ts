import { redact } from "@/core/redact"
import { supabase } from "@/core/supabase"

import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { html, itemId, userId } = req.body

  if (!html || !itemId || !userId) {
    res.send({ success: false, error: "Missing required data" })
    return
  }

  try {
    const extractedData = await extractDataFromPageHTML(html, itemId)

    if (extractedData) {
      await refreshWishlistData(userId)
      res.send({ success: true })
    } else {
      res.send({ success: false, error: "Failed to process page content" })
    }
  } catch (error) {
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const extractDataFromPageHTML = async (html: string, itemId: string) => {
  const API_ENDPOINT = process.env.PLASMO_PUBLIC_API_ENDPOINT
  const url = `${API_ENDPOINT}/wishlist/add`
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const payload = {
    page_html: html,
    item_id: itemId
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `API request failed with status ${response.status}: ${errorBody}`
      )
    }

    return await response.json()
  } catch (error) {
    console.error("Error processing page data:", error)
    return null
  }
}

const refreshWishlistData = async (userId: string) => {
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

    await storage.set("dataNeedsRefresh", true)
  } catch (error) {
    console.error("Error refreshing wishlist data:", error)
  }
}

export default handler
