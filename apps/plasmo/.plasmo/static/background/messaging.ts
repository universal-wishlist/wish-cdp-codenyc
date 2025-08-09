// @ts-nocheck
globalThis.__plasmoInternalPortMap = new Map()

import { default as messagesExtractHtml } from "~background/messages/extract-html"
import { default as messagesGetWishlistData } from "~background/messages/get-wishlist-data"
import { default as messagesInitSession } from "~background/messages/init-session"
import { default as messagesProcessPageData } from "~background/messages/process-page-data"

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  switch (request?.name) {
    
    default:
      break
  }

  return true
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.name) {
    case "extract-html":
  messagesExtractHtml({
    ...request,
    sender
  }, {
    send: (p) => sendResponse(p)
  })
  break
case "get-wishlist-data":
  messagesGetWishlistData({
    ...request,
    sender
  }, {
    send: (p) => sendResponse(p)
  })
  break
case "init-session":
  messagesInitSession({
    ...request,
    sender
  }, {
    send: (p) => sendResponse(p)
  })
  break
case "process-page-data":
  messagesProcessPageData({
    ...request,
    sender
  }, {
    send: (p) => sendResponse(p)
  })
  break
    default:
      break
  }

  return true
})

chrome.runtime.onConnect.addListener(function(port) {
  globalThis.__plasmoInternalPortMap.set(port.name, port)
  port.onMessage.addListener(function(request) {
    switch (port.name) {
      
      default:
        break
    }
  })
})

