import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    let tab: chrome.tabs.Tab | undefined

    if (req.body?.tabId) {
      [tab] = await chrome.tabs.query({ currentWindow: true }).then(tabs => 
        tabs.filter(t => t.id === req.body.tabId)
      )
    } else {
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    }

    if (!tab || !tab.id) {
      res.send({ success: false, error: "No active tab found" })
      return
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML
    })

    if (results && results[0] && results[0].result) {
      res.send({
        success: true,
        html: results[0].result,
        tab: {
          id: tab.id,
          url: tab.url,
          title: tab.title
        }
      })
    } else {
      res.send({ success: false, error: "Failed to extract page HTML" })
    }
  } catch (error) {
    res.send({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export default handler
