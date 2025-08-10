import { supabase } from "@/core/supabase"

import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { address } = req.body

  if (!address) {
    res.send({ success: false, error: "Address is required" })
    return
  }

  try {
    const result = await sendAddressToOnramp(address)

    if (result) {
      res.send({ success: true, data: result })
    } else {
      res.send({ success: false, error: "Failed to process onramp request" })
    }
  } catch (error) {
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

const sendAddressToOnramp = async (address: string) => {
  const API_ENDPOINT = process.env.PLASMO_PUBLIC_API_ENDPOINT
  const url = `${API_ENDPOINT}/wishlist/onramp`
  const {
    data: { session }
  } = await supabase.auth.getSession()

  const payload = {
    address: address
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
        `Onramp API request failed with status ${response.status}: ${errorBody}`
      )
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending address to onramp:", error)
    return null
  }
}

export default handler