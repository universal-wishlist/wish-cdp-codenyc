
import "@plasmohq/messaging"

interface MmMetadata {
	"extract-html" : {}
	"get-wishlist-data" : {}
	"init-session" : {}
	"process-page-data" : {}
}

interface MpMetadata {
	
}

declare module "@plasmohq/messaging" {
  interface MessagesMetadata extends MmMetadata {}
  interface PortsMetadata extends MpMetadata {}
}
