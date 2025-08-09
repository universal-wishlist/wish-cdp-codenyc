import { SyncRedactor } from "redact-pii-light"

const redactor = new SyncRedactor({
  builtInRedactors: {
    url: {
      enabled: false
    },
    names: {
      enabled: false
    },
    digits: {
      enabled: false
    },
    phoneNumber: {
      enabled: false
    },
    zipcode: {
      enabled: false
    }
  }
})

export const redact = (text: string) => {
  return redactor.redact(text)
}
