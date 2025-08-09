import { Logo } from "@/components/logo"
import { PriceDiscoveryBadges } from "@/components/price-discovery-badges"
import { Settings } from "@/components/settings"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/core/supabase"
import { cleanUrl, cn, formatPrice } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import {
  DollarSignIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  ShoppingCartIcon,
  Trash2Icon
} from "lucide-react"
import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { signOut } from '@coinbase/cdp-core';
import { useStorage } from "@plasmohq/storage/hook"
import { useEvmAddress, useSendEvmTransaction } from "@coinbase/cdp-hooks"

function generateMockPriceHistory(currentPrice: number) {
  const history = []
  let price = currentPrice * (0.9 + Math.random() * 0.2)

  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    const change = (Math.random() - 0.5) * 0.1 * price
    price = Math.max(price + change, currentPrice * 0.7)

    history.push({
      date: date.toISOString(),
      price: Math.round(price * 100) / 100
    })
  }

  history[history.length - 1].price = currentPrice

  return history
}

function generateMockPreviousPrice(currentPrice: number) {
  const changePercent = (Math.random() - 0.5) * 0.4
  return Math.round(currentPrice * (1 - changePercent) * 100) / 100
}

function priceToWei(priceInUSD: number): bigint {
  const fractionPrice = priceInUSD / 10000
  
  const ethPrice = fractionPrice / 3000
  
  const weiAmount = Math.floor(ethPrice * Math.pow(10, 18))
  
  const minWei = 1000000000000n
  return BigInt(Math.max(weiAmount, Number(minWei)))
}

export function Wishlist({
  user,
  onLogout,
  className,
  ...props
}: {
  user: User
  onLogout: () => void
} & React.ComponentPropsWithoutRef<"div">) {
  const [items, setItems, { remove: removeItems }] = useStorage<any[]>(
    {
      key: "wishlistItems",
      instance: new Storage({ area: "local" })
    },
    []
  )
  const [wishlistId, setWishlistId, { remove: removeWishlistId }] = useStorage<
    string | null
  >({
    key: "wishlistId",
    instance: new Storage({ area: "local" })
  })

  const [dataNeedsRefresh, setDataNeedsRefresh] = useStorage<boolean>({
    key: "dataNeedsRefresh",
    instance: new Storage({ area: "local" })
  })

  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [lastAddTime, setLastAddTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set())
  const [transactionHash, setTransactionHash] = useState<string>("")
  const [transactionError, setTransactionError] = useState<string>("")
  const [activeTransactionItem, setActiveTransactionItem] = useState<string | null>(null)
  
  const { evmAddress } = useEvmAddress()
  const { sendEvmTransaction } = useSendEvmTransaction()

  const refreshData = () => {
    setLoading(true)
    setError(null)
    sendToBackground({
      name: "get-wishlist-data",
      body: { userId: user.id }
    }).then((response) => {
      if (!response.success) {
        setError("Failed to load items. Please try again.")
      }
      setLoading(false)
      setDataNeedsRefresh(false)
    })

    loadFavorites()
  }

  const loadFavorites = async () => {
    try {
      const { data: favorites } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id)

      if (favorites) {
        setFavoriteItems(new Set(favorites.map((f) => f.product_id)))
      }
    } catch (error) {
      console.error("Error loading favorites:", error)
    }
  }

  useEffect(() => {
    if (!items || items.length === 0 || !wishlistId) {
      refreshData()
    } else if (dataNeedsRefresh) {
      refreshData()
      setDataNeedsRefresh(false)
    } else {
      setLoading(false)
    }
  }, [user.id, items, wishlistId, dataNeedsRefresh])

  useEffect(() => {
    if (items) {
      setProcessingItems((prev) => {
        const newSet = new Set(prev)
        items.forEach((item) => {
          if (item.image_url && newSet.has(item.id)) {
            newSet.delete(item.id)
          }
        })
        return newSet
      })
    }
  }, [items])

  const handleLogout = async () => {
    try {
      await signOut();
      await supabase.auth.signOut()
      removeItems()
      removeWishlistId()
      onLogout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      window.close()
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      const item = items.find((i) => i.id === itemId)
      if (!item?.wishlist_item_id) {
        setError("Cannot delete item: missing wishlist item ID.")
        return
      }

      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", item.wishlist_item_id)

      if (error) {
        setError("Failed to delete item. Please try again.")
        return
      }

      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
    } catch {
      setError("An error occurred while deleting the item.")
    }
  }

  const toggleFavorite = async (productId: string) => {
    try {
      const isFavorited = favoriteItems.has(productId)

      if (isFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId)

        if (error) {
          setError("Failed to remove from favorites.")
          return
        }

        setFavoriteItems((prev) => {
          const newSet = new Set(prev)
          newSet.delete(productId)
          return newSet
        })
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          product_id: productId
        })

        if (error) {
          setError("Failed to add to favorites.")
          return
        }

        setFavoriteItems((prev) => new Set(prev).add(productId))
      }
    } catch {
      setError("An error occurred while updating favorites.")
    }
  }

  const handleCartClick = async (item: any) => {
    if (!evmAddress) {
      setError("Please connect your wallet first.")
      return
    }

    if (!item.price) {
      setError("Item price not available for transaction.")
      return
    }

    setActiveTransactionItem(item.id)
    setTransactionError("")
    setTransactionHash("")

    try {
      const transactionValue = priceToWei(item.price)
      
      const result = await sendEvmTransaction({
        transaction: {
          to: evmAddress,
          value: transactionValue,
          gas: 21000n,
          chainId: 84532,
          type: "eip1559",
        },
        evmAccount: evmAddress,
        network: "base-sepolia",
      })

      setTransactionHash(result.transactionHash)
      setTransactionError("")
      console.log("Transaction successful:", result.transactionHash)
    } catch (error) {
      setTransactionHash("")
      setTransactionError(error instanceof Error ? error.message : 'Unknown error')
      console.error("Transaction failed:", error)
    }
  }

  const addCurrentPage = async () => {
    const now = Date.now()
    if (now - lastAddTime < 1000) {
      return
    }
    setLastAddTime(now)

    if (!wishlistId) {
      setError("No wishlist found. Please try again.")
      return
    }

    setExtracting(true)
    setError(null)

    try {
      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!currentTab || !currentTab.id) {
        setError("No active tab found. Please try again.")
        return
      }

      const response = await sendToBackground({
        name: "extract-html",
        body: { tabId: currentTab.id }
      })

      if (response.success) {
        const tab = response.tab

        let productId: string
        let isNewProduct = false

        const { data: upsertedProduct, error: productError } = await supabase
          .from("products")
          .upsert(
            {
              title: tab.title,
              source_url: cleanUrl(tab.url)
            },
            {
              onConflict: "source_url",
              ignoreDuplicates: false
            }
          )
          .select()
          .single()

        if (productError || !upsertedProduct) {
          setError("Failed to create or find product. Please try again.")
          return
        }

        productId = upsertedProduct.id
        isNewProduct =
          !upsertedProduct.created_at ||
          new Date(upsertedProduct.created_at).getTime() > Date.now() - 1000

        const { data: wishlistItem, error: wishlistItemError } = await supabase
          .from("wishlist_items")
          .upsert(
            {
              wishlist_id: wishlistId,
              product_id: productId
            },
            {
              onConflict: "wishlist_id,product_id",
              ignoreDuplicates: false
            }
          )
          .select()
          .single()

        if (wishlistItemError) {
          if (wishlistItemError.code === "23505") {
            setError("Item already exists in your wishlist.")
          } else {
            setError("Failed to add item to wishlist. Please try again.")
          }
          return
        }

        const { data: productDetails, error: detailsError } = await supabase
          .from("products")
          .select("id, title, brand, source_url, category, image_url")
          .eq("id", productId)
          .single()

        if (detailsError || !productDetails) {
          setError("Failed to fetch product details. Please try again.")
          return
        }

        const newItem = {
          id: productDetails.id,
          wishlist_item_id: wishlistItem.id,
          title: productDetails.title,
          brand: productDetails.brand,
          source_url: productDetails.source_url,
          category: productDetails.category,
          image_url: productDetails.image_url,
          created_at: wishlistItem.created_at,
          price: null,
          prices: []
        }

        setItems((prevItems) => [newItem, ...prevItems])
        setProcessingItems((prev) => new Set(prev).add(newItem.id))

        if (isNewProduct) {
          sendToBackground({
            name: "process-page-data",
            body: {
              html: response.html,
              itemId: productId,
              userId: user.id
            }
          }).catch((error) => {
            console.error("Background processing error:", error)
          })
        }
      } else {
        setError("Failed to extract page content. Please try again.")
      }
    } catch {
      setError("An error occurred while adding the page.")
    } finally {
      setExtracting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2Icon className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) alert(error)

  return (
    <div className={cn("flex h-full flex-col", className)} {...props}>
      <div
        className={cn(
          items.length === 0 ? "border-b" : "",
          "border-gray-200 bg-white px-4 py-3"
        )}>
        <div className="flex items-center justify-between">
          <Logo className="ml-[10px] text-blue-500" />
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={addCurrentPage}
              disabled={extracting}
              className="bg-blue-500 text-white hover:bg-blue-600">
              {extracting ? "Adding..." : "Add from page"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!evmAddress) {
                  setError("Please connect your wallet first.")
                  return
                }
                
                try {
                  const response = await sendToBackground({
                    name: "onramp",
                    body: { address: evmAddress }
                  })
                  if (response.success) {
                    window.open(response.data, "_blank")
                  } else {
                    setError(response.error || "Onramp request failed")
                  }
                } catch (error) {
                  setError("Failed to send onramp request")
                  console.error("Onramp error:", error)
                }
              }}>
              <DollarSignIcon className="h-4 w-4" />
            </Button>
            <Settings handleLogout={handleLogout} />
          </div>
        </div>
      </div>

      <div className="flex-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="border-t border-gray-200 bg-white px-4 py-4">
            <div
              className={`flex justify-between ${
                item.price ? "items-start" : "items-center"
              }`}>
              <div className="mr-3 flex-shrink-0">
                {item.image_url ? (
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      if (item.source_url) {
                        const url = new URL(item.source_url)
                        url.searchParams.set("ref", "wish")
                        chrome.tabs.create({ url: url.toString() })
                      }
                    }}
                    title={
                      item.source_url
                        ? "Click to open in new tab"
                        : "No URL available"
                    }>
                    <img
                      src={item.image_url}
                      alt={item.title || "Item image"}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative h-12 w-12">
                    <Skeleton className="relative h-12 w-12 rounded-md" />
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <Loader2Icon className="h-5 w-5 animate-spin text-blue-500" />
                    </div>
                  </div>
                )}
              </div>
              <div className="mr-3 flex-1">
                <h3
                  className="line-clamp-1 cursor-pointer font-semibold text-blue-500 transition-colors hover:text-blue-600"
                  onClick={() => {
                    if (item.source_url) {
                      const url = new URL(item.source_url)
                      url.searchParams.set("ref", "wish")
                      chrome.tabs.create({ url: url.toString() })
                    }
                  }}
                  title={
                    item.source_url
                      ? "Click to open in new tab"
                      : "No URL available"
                  }>
                  {item.title}
                  {item.brand ? ` | ${item.brand}` : ""}
                </h3>
                {item.price && (
                  <div className="mt-2 flex items-center">
                    <span className="w-16 flex-shrink-0 text-sm font-bold text-gray-900">
                      ${formatPrice(item.price)}
                    </span>
                    {favoriteItems.has(item.id) && (
                      <div className="flex flex-1 justify-end">
                        <PriceDiscoveryBadges
                          currentPrice={item.price}
                          previousPrice={generateMockPreviousPrice(item.price)}
                          priceHistory={generateMockPriceHistory(item.price)}
                          targetPrice={item.target_price}
                          maxBadges={2}
                          className="justify-end"
                        />
                      </div>
                    )}
                    <div
                      className={`flex gap-2 ${favoriteItems.has(item.id) ? "ml-2" : "ml-auto"}`}>
                      <button
                        className="h-4 w-4 text-gray-400 transition-colors hover:text-gray-600"
                        title={
                          favoriteItems.has(item.id)
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        onClick={() => toggleFavorite(item.id)}>
                        {favoriteItems.has(item.id) ? (
                          <EyeIcon className="h-4 w-4" />
                        ) : (
                          <EyeOffIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        className="h-4 w-4 text-gray-400 transition-colors hover:text-gray-600"
                        title="Add to cart (1/100th price transaction)"
                        onClick={() => handleCartClick(item)}>
                        <ShoppingCartIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="h-4 w-4 text-gray-400 transition-colors hover:text-gray-600"
                        title="Remove item"
                        onClick={() => deleteItem(item.id)}>
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Transaction Processing */}
                {activeTransactionItem === item.id && !transactionHash && !transactionError && (
                  <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <div className="mb-2 text-sm font-medium text-blue-900">
                      Processing Transaction (${formatPrice(item.price / 100)})
                    </div>
                    <div className="flex items-center justify-center">
                      <Loader2Icon className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="ml-2 text-sm text-blue-700">Sending transaction...</span>
                    </div>
                  </div>
                )}

                {/* Transaction Hash Display */}
                {transactionHash && activeTransactionItem === item.id && (
                  <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3">
                    <div className="mb-1 text-sm font-medium text-green-900">
                      Transaction Sent!
                    </div>
                    <p className="text-sm text-green-700">
                      Hash:{" "}
                      <a
                        href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs underline hover:text-green-900"
                      >
                        {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                      </a>
                    </p>
                    <button 
                      onClick={() => {setTransactionHash(""); setActiveTransactionItem(null)}}
                      className="mt-2 text-xs text-green-600 hover:text-green-800"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* Transaction Error Display */}
                {transactionError && activeTransactionItem === item.id && (
                  <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                    <div className="mb-1 text-sm font-medium text-red-900">
                      Transaction Failed
                    </div>
                    <p className="text-sm text-red-700">{transactionError}</p>
                    <button 
                      onClick={() => {setTransactionError(""); setActiveTransactionItem(null)}}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center bg-white">
            <p className="text-gray-500">No items in your list yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
